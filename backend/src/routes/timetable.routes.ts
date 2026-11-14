import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { Timetable, TimetableWriteLock } from '../models/Timetable.js';
import { User } from '../models/User.js';

const router = Router();
const authorities = (u: any) => ['admin','superadmin','dean','principal'].includes(u.role);
const canManage = (u: any, institution: string) => u.institution === institution && (authorities(u) || u.responsibilities?.includes('timetable_coordinator'));
const overlap = (a: any, b: any) => a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
const valid = (s: any) => s && Number.isInteger(s.dayOfWeek) && s.dayOfWeek >= 1 && s.dayOfWeek <= 7 && Number.isInteger(s.startMinutes) && Number.isInteger(s.endMinutes) && s.startMinutes >= 0 && s.endMinutes <= 1440 && s.startMinutes < s.endMinutes && s.courseCode && s.courseName && s.facultyId && s.roomNumber && s.section && s.department && s.academicYear && Number.isInteger(s.semester) && s.semester >= 1 && s.semester <= 12;
const fail = (res: Response, status: number, message: string) => res.status(status).json({ message });

async function withDepartmentLock<T>(institution: string, department: string, fn: () => Promise<T>): Promise<T> {
  const owner = randomUUID(); const deadline = Date.now() + 30000;
  while (true) {
    try {
      const lock = await TimetableWriteLock.findOneAndUpdate(
        { institution, department, $or: [{ lockExpiresAt: { $lt: new Date() } }, { lockExpiresAt: { $exists: false } }, { lockOwner: owner }] },
        { $set: { lockOwner: owner, lockExpiresAt: new Date(deadline) }, $inc: { version: 1 } },
        { new: true }
      );
      if (!lock && !(await TimetableWriteLock.exists({ institution, department }))) {
        try { await TimetableWriteLock.create({ institution, department, version: 1, lockOwner: owner, lockExpiresAt: new Date(deadline) }); }
        catch (createErr: any) { if (createErr.code !== 11000) throw createErr; }
      }
      const acquired = await TimetableWriteLock.findOne({ institution, department });
      if (!acquired || acquired.lockOwner !== owner) throw new Error('department lock is busy');
      break;
    } catch (e: any) {
      if (Date.now() >= deadline || e.code !== 11000 && e.message !== 'department lock is busy') throw new Error('Timetable is being updated; retry shortly.');
      await new Promise(resolve => setTimeout(resolve, 25 + Math.floor(Math.random() * 50)));
    }
  }
  try { return await fn(); }
  finally { await TimetableWriteLock.updateOne({ institution, department, lockOwner: owner }, { $unset: { lockOwner: 1, lockExpiresAt: 1 } }); }
}

async function findConflicts(s: any, excludeId?: string, excludeChangeSet?: string, replacedSections: Set<string> = new Set()) {
  const base: any = { institution: s.institution, academicYear: s.academicYear, dayOfWeek: s.dayOfWeek, isActive: true, revision: { $exists: true }, effectiveFrom: { $lte: s.effectiveTo || new Date('9999-12-31') }, $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: s.effectiveFrom || new Date(0) } }] };
  if (excludeId) base._id = { $ne: excludeId };
  if (excludeChangeSet) base.changeSetId = { $ne: excludeChangeSet };
  const candidates = await Timetable.find(base);
  return candidates.filter(x => {
    if (replacedSections.has(`${x.academicYear}:${x.semester}:${x.section}`.toLowerCase())) return false;
    if (!overlap(s, x)) return false;
    const sectionConflict = x.department === s.department && x.semester === s.semester && x.section.toLowerCase() === s.section.toLowerCase();
    const facultyConflict = x.facultyId.toString() === String(s.facultyId);
    const roomConflict = x.roomNumber.toLowerCase() === String(s.roomNumber).toLowerCase() && x.building.toLowerCase() === String(s.building || '').toLowerCase();
    const labConflict = (x.sessionType === 'laboratory' || s.sessionType === 'laboratory') && roomConflict;
    return sectionConflict || facultyConflict || roomConflict || labConflict;
  }).map(x => ({ id: x._id, courseCode: x.courseCode, section: x.section, facultyId: x.facultyId, roomNumber: x.roomNumber, startMinutes: x.startMinutes, endMinutes: x.endMinutes }));
}

// Stage one or multiple slots as a revision. All slot writes for the department are serialized.
router.post('/revisions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; const { institution = u.institution, slots } = req.body;
    if (!canManage(u, institution)) return fail(res, 403, 'Institution timetable manager permission is required');
    if (!Array.isArray(slots) || !slots.length || slots.some((s: any) => !valid(s))) return fail(res, 400, 'Provide one or more valid timetable slots');
    if (u.role === 'faculty' && slots.some((s: any) => String(s.facultyId) !== u._id.toString())) return fail(res, 403, 'Faculty may schedule only their own sessions');
    const department = String(slots[0].department);
    if (slots.some((s: any) => s.department !== department)) return fail(res, 400, 'A timetable revision must contain one department');
    const results = await withDepartmentLock(institution, department, async () => {
      const changeSetId = randomUUID(); const inserted: any[] = [];
      const replacedSections = new Set(slots.map((s: any) => `${s.academicYear}:${s.semester}:${s.section}`.toLowerCase()));
      const revisions = await Timetable.distinct('revision', { institution, department, academicYear: slots[0].academicYear });
      const revision = Math.max(0, ...revisions) + 1;
      try {
        for (const s of slots) {
          const faculty = await User.findOne({ _id: s.facultyId, institution, role: 'faculty', isActive: true }); if (!faculty) throw new Error(`Invalid faculty assignment ${s.facultyId}`);
          const conflicts = await findConflicts({ ...s, institution, effectiveFrom: s.effectiveFrom ? new Date(s.effectiveFrom) : new Date(), effectiveTo: s.effectiveTo ? new Date(s.effectiveTo) : undefined }, undefined, changeSetId, replacedSections);
          const inRevision = inserted.filter(x => x.dayOfWeek === s.dayOfWeek && overlap(s, x) && (x.facultyId.toString() === String(s.facultyId) || x.roomNumber.toLowerCase() === String(s.roomNumber).toLowerCase() && x.building.toLowerCase() === String(s.building || '').toLowerCase() || x.department === department && x.semester === s.semester && x.section.toLowerCase() === s.section.toLowerCase()));
          if (conflicts.length || inRevision.length) throw new Error(`Schedule conflict detected: ${JSON.stringify([...conflicts, ...inRevision.map(x => ({ courseCode: x.courseCode, section: x.section }))])}`);
          const slot = await Timetable.create({ ...s, institution, createdBy: u._id, revision, publishedAt: undefined, isActive: false, effectiveFrom: s.effectiveFrom || new Date(), sectionId: `${s.department}:${s.academicYear}:${s.semester}:${s.section}`.toLowerCase(), changeSetId });
          inserted.push(slot);
        }
        return inserted;
      } catch (err) { await Timetable.deleteMany({ changeSetId }); throw err; }
    });
    res.status(201).json({ revision: results[0].revision, changeSetId: results[0].changeSetId, slots: results });
  } catch (e: any) { fail(res, e.message?.includes('conflict') ? 409 : 400, e.message); }
});

router.post('/revisions/:changeSetId/publish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await Timetable.find({ changeSetId: req.params.changeSetId }); if (!rows.length) return fail(res, 404, 'Revision not found');
    const u: any = req.user!; if (!canManage(u, rows[0].institution)) return fail(res, 403, 'Institution timetable authority is required');
    const result = await withDepartmentLock(rows[0].institution, rows[0].department, async () => {
      const again = await Timetable.find({ changeSetId: req.params.changeSetId });
      const replacedSections = new Set(again.map(x => `${x.academicYear}:${x.semester}:${x.section}`.toLowerCase()));
      for (const row of again) { const conflicts = await findConflicts(row, row._id.toString(), req.params.changeSetId, replacedSections); if (conflicts.length) throw new Error(`Publish conflict: ${JSON.stringify(conflicts)}`); }
      const scopes = [...new Map(again.map(x => [`${x.academicYear}:${x.semester}:${x.section}`, { academicYear: x.academicYear, semester: x.semester, section: x.section }])).values()];
      for (const scope of scopes) await Timetable.updateMany({ institution: rows[0].institution, department: rows[0].department, ...scope, isActive: true, _id: { $nin: again.map(x => x._id) } }, { $set: { isActive: false } });
      await Timetable.updateMany({ changeSetId: req.params.changeSetId }, { $set: { isActive: true, publishedAt: new Date() } });
      return Timetable.find({ changeSetId: req.params.changeSetId });
    });
    res.json({ slots: result, published: true });
  } catch (e: any) { fail(res, e.message?.includes('conflict') ? 409 : 400, e.message); }
});

router.get('/department/:department', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; if (u.institution !== String(req.query.institution || u.institution)) return fail(res, 403, 'Cross-institution access denied');
    const q: any = { institution: u.institution, department: req.params.department, isActive: true, publishedAt: { $exists: true } };
    for (const k of ['academicYear','semester','section']) if (req.query[k] !== undefined) q[k] = req.query[k];
    if (req.query.effectiveOn) { const date = new Date(String(req.query.effectiveOn)); q.effectiveFrom = { $lte: date }; q.$or = [{ effectiveTo: { $exists: false } }, { effectiveTo: null }, { effectiveTo: { $gte: date } }]; }
    const slots = await Timetable.find(q).populate('facultyId','name email department').sort({ dayOfWeek: 1, startMinutes: 1 }); res.json({ slots });
  } catch (e: any) { fail(res, 500, e.message); }
});
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; const q: any = { institution: u.institution, isActive: true, publishedAt: { $exists: true } };
    if (u.role === 'student') { q.department = u.department; q.semester = u.semester; q.section = u.section; }
    else if (u.role === 'faculty') q.facultyId = u._id;
    else return fail(res, 403, 'Student or faculty account required');
    if (req.query.academicYear) q.academicYear = req.query.academicYear;
    const slots = await Timetable.find(q).sort({ dayOfWeek: 1, startMinutes: 1 }); res.json({ slots });
  } catch (e: any) { fail(res, 500, e.message); }
});

export default router;
