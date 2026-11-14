import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { Event } from '../models/Event.js';
import { EventRegistration } from '../models/EventRegistration.js';
import { AcademicCalendar } from '../models/AcademicCalendar.js';
import { UploadedFile } from '../models/UploadedFile.js';
import { User } from '../models/User.js';
import { DeliveryService } from '../services/delivery.service.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js';

const router = Router();
const idOk = (id: string) => Types.ObjectId.isValid(id);
const activeStatuses = ['registered', 'waitlisted', 'attended'];
const isAuthority = (u: any) => ['dean', 'principal', 'admin', 'superadmin'].includes(u.role);
const isAdmin = (u: any) => ['admin', 'superadmin'].includes(u.role);
const hasAdvisor = (u: any) => (u.responsibilities || []).includes('club_advisor');
const sameInst = (u: any, e: any) => isAdmin(u) || u.institution === e.institution;
const canManage = (u: any, e: any) => sameInst(u, e) && (
  e.organizer.toString() === u._id.toString() || isAuthority(u) ||
  (u.role === 'faculty' && e.coordinators.some((c: any) => c.userId.toString() === u._id.toString())) ||
  (hasAdvisor(u) && u.role === 'faculty')
);
const sendError = (res: Response, err: any) => res.status(err.statusCode || 500).json({ message: err.message || 'Unexpected error' });
const parseDate = (v: any, name: string): Date => {
  const d = new Date(v);
  if (!v || Number.isNaN(d.getTime())) throw new BadRequestError(`${name} must be a valid date`);
  return d;
};
function validateEventInput(body: any, partial = false) {
  if (!partial && (!body.title || !body.description || !body.startDate || !body.endDate)) throw new BadRequestError('title, description, startDate and endDate are required');
  if (body.startDate && body.endDate && parseDate(body.startDate, 'startDate') >= parseDate(body.endDate, 'endDate')) throw new BadRequestError('endDate must be after startDate');
  if (body.registrationOpenDate && body.registrationCloseDate && parseDate(body.registrationOpenDate, 'registrationOpenDate') > parseDate(body.registrationCloseDate, 'registrationCloseDate')) throw new BadRequestError('Registration opens after it closes');
  if (body.capacity !== undefined && (!Number.isInteger(body.capacity) || body.capacity < 0)) throw new BadRequestError('capacity must be a non-negative integer; 0 means unlimited');
  if (body.isTeamEvent && (body.minTeamSize < 2 || body.maxTeamSize < body.minTeamSize)) throw new BadRequestError('Team size range is invalid');
  if (body.mode === 'online' && body.onlineMeetingUrl && !/^https:\/\//i.test(body.onlineMeetingUrl)) throw new BadRequestError('Online meeting URL must use HTTPS');
}
const eventFields = ['title','description','mode','venue','onlineMeetingUrl','startDate','endDate','registrationOpenDate','registrationCloseDate','audience','eligibility','rules','capacity','isTeamEvent','minTeamSize','maxTeamSize','allowWaitlist','coordinators','sponsors','flyerUrl','files','schedule','category','tags','community'];

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u = req.user!;
    const q: any = { status: { $in: ['published','ongoing','completed'] }, institution: u.institution };
    if (req.query.institution && isAdmin(u)) q.institution = String(req.query.institution);
    if (req.query.status && (isAuthority(u) || isAdmin(u))) q.status = String(req.query.status);
    if (req.query.from || req.query.to) q.startDate = { ...(req.query.from ? { $gte: parseDate(req.query.from, 'from') } : {}), ...(req.query.to ? { $lte: parseDate(req.query.to, 'to') } : {}) };
    const events = await Event.find(q).sort({ startDate: 1 }).limit(Math.min(Number(req.query.limit) || 50, 100));
    res.json({ events });
  } catch (e) { sendError(res, e); }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u = req.user!;
    if (!(u.role === 'faculty' || isAuthority(u) || hasAdvisor(u))) throw new ForbiddenError('Only faculty, club advisors, Dean, Principal, and Admin may create events');
    validateEventInput(req.body);
    const d: any = { institution: u.role === 'superadmin' ? req.body.institution : u.institution, organizer: u._id, status: 'draft', ...Object.fromEntries(eventFields.filter(k => req.body[k] !== undefined).map(k => [k, req.body[k]])) };
    if (!d.institution) throw new BadRequestError('institution is required for superadmin');
    if (d.files?.some((f: any) => !idOk(String(f.fileId)))) throw new BadRequestError('Event files must reference UploadedFile records');
    if (d.files?.length) {
      const fileIds = d.files.map((f: any) => f.fileId);
      const count = await UploadedFile.countDocuments({ _id: { $in: fileIds }, uploaderId: u._id, associatedEntityType: 'event', isQuarantined: false, virusScanClean: true });
      if (count !== new Set(fileIds.map(String)).size) throw new ForbiddenError('Files must be clean event uploads owned by the current user');
    }
    const event = await Event.create(d);
    res.status(201).json({ event });
  } catch (e) { sendError(res, e); }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const e = await Event.findById(req.params.id);
    if (!e) throw new NotFoundError('Event not found');
    if (!sameInst(req.user!, e) && e.status !== 'published' && e.status !== 'ongoing' && e.status !== 'completed') throw new ForbiddenError('Event is not available');
    const registration = await EventRegistration.find({ eventId: e._id, userId: req.user!._id, status: { $in: activeStatuses } });
    res.json({ event: e, myRegistration: registration[0] || null });
  } catch (e) { sendError(res, e); }
});

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const e = await Event.findById(req.params.id); if (!e) throw new NotFoundError('Event not found');
    if (!canManage(req.user!, e)) throw new ForbiddenError('Not authorized to edit this event');
    if (!['draft','rejected','pending_review','approved'].includes(e.status)) throw new ConflictError('Published events cannot be edited through this endpoint');
    validateEventInput(req.body, true);
    for (const k of eventFields) if (req.body[k] !== undefined) (e as any)[k] = req.body[k];
    if (req.body.files !== undefined) {
      const ids = req.body.files.map((f: any) => f.fileId);
      const count = await UploadedFile.countDocuments({ _id: { $in: ids }, uploaderId: req.user!._id, associatedEntityType: 'event', isQuarantined: false, virusScanClean: true });
      if (count !== new Set(ids.map(String)).size) throw new ForbiddenError('Event files must be clean event uploads owned by the current user');
    }
    await e.save(); res.json({ event: e });
  } catch (err) { sendError(res, err); }
});

router.post('/:id/submit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const e = await Event.findById(req.params.id); if (!e) throw new NotFoundError('Event not found');
    if (!canManage(req.user!, e)) throw new ForbiddenError('Not authorized to submit this event');
    if (!e.flyerUrl && !e.files.some(f => f.fileType === 'flyer')) throw new BadRequestError('A mandatory event flyer is required');
    if (!['draft','rejected'].includes(e.status)) throw new ConflictError('Event cannot be submitted in its current status');
    e.status = 'pending_review'; e.rejectionReason = ''; await e.save(); res.json({ event: e });
  } catch (e) { sendError(res, e); }
});

router.post('/:id/review', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const e = await Event.findById(req.params.id); if (!e) throw new NotFoundError('Event not found');
    if (!isAuthority(req.user!) || !sameInst(req.user!, e)) throw new ForbiddenError('Institution authority is required');
    if (e.status !== 'pending_review') throw new ConflictError('Event is not awaiting review');
    if (req.body.decision === 'approve') { e.status = 'approved'; e.approvedBy = req.user!._id as any; e.approvedAt = new Date(); }
    else if (req.body.decision === 'reject' && String(req.body.reason || '').trim()) { e.status = 'rejected'; e.rejectionReason = String(req.body.reason).trim(); }
    else throw new BadRequestError('decision must be approve or reject; rejection requires reason');
    await e.save(); res.json({ event: e });
  } catch (e) { sendError(res, e); }
});

router.post('/:id/publish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const e = await Event.findById(req.params.id); if (!e) throw new NotFoundError('Event not found');
    if (!canManage(req.user!, e)) throw new ForbiddenError('Not authorized to publish this event');
    if (e.status !== 'approved' && !isAuthority(req.user!)) throw new ConflictError('Event must be approved before publication');
    if (!e.flyerUrl && !e.files.some(f => f.fileType === 'flyer')) throw new BadRequestError('A mandatory event flyer is required');
    e.status = 'published'; e.publishedAt = new Date(); await e.save();
    await DeliveryService.deliverContentNotification({ senderId: req.user!._id, type: 'announcement', entityId: e._id.toString(), institution: e.institution, visibility: 'institution-only', specificRecipients: (await User.find({ institution: e.institution, isActive: true }).select('_id')).map(x => x._id), message: `New event: ${e.title}` });
    res.json({ event: e });
  } catch (e) { sendError(res, e); }
});

router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const e = await Event.findById(req.params.id); if (!e) throw new NotFoundError('Event not found');
    if (!canManage(req.user!, e)) throw new ForbiddenError('Not authorized to cancel this event');
    if (['completed','cancelled'].includes(e.status)) throw new ConflictError('Event cannot be cancelled in its current status');
    e.status = 'cancelled'; e.cancelledBy = req.user!._id as any; e.cancelledAt = new Date(); e.cancellationReason = String(req.body.reason || '').trim(); await e.save();
    const users = await EventRegistration.find({ eventId: e._id, status: { $in: ['registered','attended'] } }).distinct('userId');
    await DeliveryService.deliverContentNotification({ senderId: req.user!._id, specificRecipients: users, type: 'schedule_change', entityId: `${e._id}:cancelled:${e.cancelledAt.getTime()}`, message: `Event cancelled: ${e.title}. ${e.cancellationReason}` });
    res.json({ event: e });
  } catch (e) { sendError(res, e); }
});

// HOLPS: Hold (atomic seat reservation), Operate (create record), Log (idempotency key), Settle (compensate on failure).
router.post('/:id/register', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; const id = req.params.id;
    if (!idOk(id)) throw new BadRequestError('Invalid event id');
    const key = String(req.get('Idempotency-Key') || req.body.idempotencyKey || '').trim();
    if (key.length < 8 || key.length > 128) throw new BadRequestError('Idempotency-Key of 8 to 128 characters is required');
    const found = await Event.findOne({ _id: id, 'idempotencyKeys.key': key }).select('+idempotencyKeys');
    if (found) {
      const saved = await EventRegistration.findById(found.idempotencyKeys.find(x => x.key === key)?.registrationId);
      res.json({ registration: saved, idempotentReplay: true }); return;
    }
    let result: any;
    {
      const e = await Event.findById(id).select('+idempotencyKeys'); if (!e) throw new NotFoundError('Event not found');
      if (e.institution !== u.institution) throw new ForbiddenError('Cross-institution registration is not permitted');
      if (!['published','ongoing'].includes(e.status)) throw new ConflictError('Registration is not open for this event');
      const now = new Date();
      if (e.registrationOpenDate && now < e.registrationOpenDate || e.registrationCloseDate && now > e.registrationCloseDate) throw new ConflictError('Registration period is closed');
      const existing = await EventRegistration.findOne({ eventId: e._id, userId: u._id, status: { $in: activeStatuses } });
      if (existing) { res.status(200).json({ registration: existing, idempotentReplay: true }); return; }
      const memberIds = Array.isArray(req.body.teamMembers) ? req.body.teamMembers.map((m: any) => String(m.userId)) : [];
      const seatCount = 1 + memberIds.length;
      if (new Set(memberIds).size !== memberIds.length || memberIds.includes(u._id.toString())) throw new BadRequestError('Team members must be unique and cannot include the team leader');
      if (e.isTeamEvent) { if (seatCount < e.minTeamSize || seatCount > e.maxTeamSize) throw new BadRequestError(`Team size must be between ${e.minTeamSize} and ${e.maxTeamSize}`); }
      else if (memberIds.length) throw new BadRequestError('This is an individual event');
      let status: any = 'registered';
      if (e.capacity > 0 && e.allocatedSeats + seatCount > e.capacity) {
        if (!e.allowWaitlist) throw new ConflictError('Event capacity is full');
        status = 'waitlisted';
      }
      if (status === 'registered') {
        const gate: any = { _id: e._id };
        if (e.capacity > 0) gate.$expr = { $lte: [{ $add: ['$allocatedSeats', seatCount] }, '$capacity'] };
        const held = await Event.findOneAndUpdate(gate, { $inc: { allocatedSeats: seatCount, registrationLockVersion: 1 } }, { new: true });
        if (!held) { if (!e.allowWaitlist) throw new ConflictError('Event capacity is full'); status = 'waitlisted'; }
      }
      const members = memberIds.length ? await User.find({ _id: { $in: memberIds }, institution: e.institution, isActive: true }).select('name email') : [];
      if (members.length !== memberIds.length) throw new BadRequestError('Every team member must be an active member of this institution');
      const reg = new EventRegistration({ eventId: e._id, userId: u._id, status, teamName: req.body.teamName || '', teamMembers: members.map(m => ({ userId: m._id, name: m.name, email: m.email })), seatsAllocated: seatCount, ticketCode: randomBytes(12).toString('hex') });
      try {
        await reg.save();
        if (status === 'waitlisted') { reg.waitlistPosition = await EventRegistration.countDocuments({ eventId: e._id, status: 'waitlisted' }); await reg.save(); }
        e.idempotencyKeys.push({ key, userId: u._id, registrationId: reg._id, createdAt: now });
        if (e.idempotencyKeys.length > 1000) e.idempotencyKeys.splice(0, e.idempotencyKeys.length - 1000);
        await e.save(); result = reg;
      } catch (err) {
        if (status === 'registered') await Event.updateOne({ _id: e._id }, { $inc: { allocatedSeats: -seatCount } });
        throw err;
      }
    }
    if (result?.status === 'registered') await DeliveryService.deliverContentNotification({ senderId: u._id, specificRecipients: [u._id], type: 'event_registration', entityId: `${result._id}:confirmed`, message: `Registration confirmed for ${(await Event.findById(id))?.title}` });
    res.status(201).json({ registration: result, idempotentReplay: false });
  } catch (e) { sendError(res, e); }
});

router.delete('/:id/register/:registrationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    let promoted: any = null;
    {
      const e = await Event.findById(req.params.id); if (!e) throw new NotFoundError('Event not found');
      const r = await EventRegistration.findById(req.params.registrationId); if (!r || !r.eventId.equals(e._id)) throw new NotFoundError('Registration not found');
      if (r.userId.toString() !== req.user!._id.toString() && !canManage(req.user!, e)) throw new ForbiddenError('Cannot cancel this registration');
      if (r.status === 'cancelled') { promoted = null; return; }
      if (r.status === 'registered' || r.status === 'attended') {
        e.allocatedSeats = Math.max(0, e.allocatedSeats - r.seatsAllocated);
        const next = await EventRegistration.findOne({ eventId: e._id, status: 'waitlisted' }).sort({ registeredAt: 1, _id: 1 });
        if (next && (e.capacity === 0 || e.allocatedSeats + next.seatsAllocated <= e.capacity)) {
          next.status = 'registered'; next.waitlistPosition = undefined; await next.save(); e.allocatedSeats += next.seatsAllocated; promoted = next;
          const rest = await EventRegistration.find({ eventId: e._id, status: 'waitlisted' }).sort({ registeredAt: 1 });
          for (let i=0;i<rest.length;i++) { rest[i].waitlistPosition = i+1; await rest[i].save(); }
        }
      }
      r.status = 'cancelled'; r.cancelledAt = new Date(); r.cancelledReason = String(req.body?.reason || ''); await r.save(); await e.save();
    }
    if (promoted) await DeliveryService.deliverContentNotification({ senderId: req.user!._id, specificRecipients: [promoted.userId], type: 'event_registration', entityId: `${promoted._id}:promoted`, message: 'A seat opened and you have been promoted from the waitlist.' });
    res.json({ cancelled: true, promotedRegistration: promoted });
  } catch (e) { sendError(res, e); }
});

router.get('/:id/registrations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const e = await Event.findById(req.params.id); if (!e) throw new NotFoundError('Event not found');
    if (!canManage(req.user!, e)) throw new ForbiddenError('Not authorized to view participants');
    const q: any = { eventId: e._id, status: { $in: activeStatuses } }; if (req.query.status) q.status = String(req.query.status);
    const registrations = await EventRegistration.find(q).populate('userId', 'name email department').sort({ registeredAt: 1 }); res.json({ registrations });
  } catch (e) { sendError(res, e); }
});

router.post('/:id/attendance/:registrationId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const e = await Event.findById(req.params.id); if (!e) throw new NotFoundError('Event not found'); if (!canManage(req.user!, e)) throw new ForbiddenError('Not authorized to record attendance');
    const r = await EventRegistration.findOne({ _id: req.params.registrationId, eventId: e._id }); if (!r) throw new NotFoundError('Registration not found');
    if (!['registered','attended'].includes(r.status)) throw new ConflictError('Only registered participants can be marked attended');
    r.status = req.body.attended === false ? 'registered' : 'attended'; r.attendanceMarked = req.body.attended !== false; r.attendedAt = r.attendanceMarked ? new Date() : undefined; await r.save(); res.json({ registration: r });
  } catch (e) { sendError(res, e); }
});

// Calendar create/update routes are institution scoped. Events are embedded for atomic publication.
router.get('/calendar/list', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const inst = String(req.query.institution || req.user!.institution); if (inst !== req.user!.institution && !isAdmin(req.user!)) throw new ForbiddenError('Cross-institution access denied');
    const q: any = { institution: inst, ...(req.query.academicYear ? { academicYear: String(req.query.academicYear) } : {}), ...(!isAuthority(req.user!) ? { isPublished: true } : {}) };
    const calendars = await AcademicCalendar.find(q).sort({ academicYear: 1, semesterType: 1 });
    const from = req.query.from ? parseDate(req.query.from, 'from') : null; const to = req.query.to ? parseDate(req.query.to, 'to') : null;
    res.json({ calendars: calendars.map(c => ({ ...c.toObject(), events: c.events.filter(x => (!from || x.endDate >= from) && (!to || x.startDate <= to)) })) });
  } catch (e) { sendError(res, e); }
});
router.post('/calendar', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u = req.user!; const institution = u.role === 'superadmin' ? String(req.body.institution || '') : u.institution;
    if (!institution || !isAuthority(u)) throw new ForbiddenError('Dean, Principal, or Admin is required to manage calendars');
    const { academicYear, semesterType, collegeId } = req.body; if (!academicYear || !['odd','even','annual'].includes(semesterType)) throw new BadRequestError('academicYear and semesterType are required');
    const calendar = await AcademicCalendar.findOneAndUpdate({ institution, academicYear, semesterType }, { $setOnInsert: { institution, academicYear, semesterType, collegeId, createdBy: u._id, events: [], isPublished: false } }, { upsert: true, new: true, runValidators: true });
    res.status(201).json({ calendar });
  } catch (e) { sendError(res, e); }
});
router.put('/calendar/:calendarId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const c = await AcademicCalendar.findById(req.params.calendarId); if (!c) throw new NotFoundError('Calendar not found'); if (!isAuthority(req.user!) || !sameInst(req.user!, c)) throw new ForbiddenError('Institution authority is required');
    if (req.body.events !== undefined) c.events = req.body.events;
    const publishing = req.body.isPublished === true && !c.isPublished;
    if (req.body.isPublished !== undefined) c.isPublished = Boolean(req.body.isPublished);
    await c.save();
    if (publishing || req.body.events !== undefined) {
      const recipients = await User.find({ institution: c.institution, isActive: true }).select('_id');
      await DeliveryService.deliverContentNotification({ senderId: req.user!._id, specificRecipients: recipients.map(x => x._id), type: 'calendar_change', entityId: `${c._id}:${c.updatedAt.getTime()}`, message: `Academic calendar updated for ${c.academicYear}` });
    }
    res.json({ calendar: c });
  } catch (e) { sendError(res, e); }
});

export default router;
