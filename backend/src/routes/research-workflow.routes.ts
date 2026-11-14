import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { ResearchPaper } from '../models/ResearchPaper.js';
import { ResearchReview } from '../models/ResearchReview.js';
import { MentorshipBinding } from '../models/MentorshipBinding.js';
import { ResearchCollaboration } from '../models/ResearchCollaboration.js';
import { User } from '../models/User.js';
import { DeliveryService } from '../services/delivery.service.js';
import { isInstitutionProctor } from '../utils/research-review-access.js';

const router = Router();
const fail = (res: Response, code: number, message: string) => res.status(code).json({ message });
const manager = (u: any) => ['admin','superadmin','dean','principal'].includes(u.role);
const validId = (x: any) => Types.ObjectId.isValid(String(x));
const notify = async (sender: any, recipients: any[], entityId: string, message: string) => {
  await DeliveryService.deliverContentNotification({ senderId: sender, specificRecipients: recipients, type: 'system', entityId, message });
};
// Assignment lifecycle and history: POST/GET /assignments, POST /assignments/:id/reassign
router.post('/assignments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; const { studentId, facultyId, assignmentType, collaborationId } = req.body;
    if (!(manager(u) || u.role === 'faculty' && u.responsibilities?.includes('rnd_staff'))) return fail(res, 403, 'R&D authority is required to assign reviewers');
    if (!validId(studentId) || !validId(facultyId) || !['proctor','project_guide'].includes(assignmentType)) return fail(res, 400, 'Valid studentId, facultyId, assignmentType are required');
    const [student, faculty] = await Promise.all([User.findById(studentId), User.findById(facultyId)]);
    if (!student || student.role !== 'student' || !faculty || faculty.role !== 'faculty' || student.institution !== faculty.institution || (!manager(u) && student.institution !== u.institution)) return fail(res, 400, 'Student and faculty must be valid members of the same institution');
    if (assignmentType === 'project_guide' && collaborationId && !validId(collaborationId)) return fail(res, 400, 'collaborationId must be a valid id');
    if (assignmentType === 'project_guide' && collaborationId && !await ResearchCollaboration.exists({ _id: collaborationId, institution: student.institution })) return fail(res, 404, 'Project not found in student institution');
    const binding = await MentorshipBinding.create({ student: student._id, faculty: faculty._id, assignmentType, collaborationId: assignmentType === 'project_guide' ? collaborationId : undefined, department: student.department, institution: student.institution, collegeId: student.collegeId, status: 'active' });
    await notify(u._id, [faculty._id, student._id], binding._id.toString(), `You have been assigned as ${assignmentType === 'proctor' ? 'Proctor' : 'Project Guide'} for ${student.name}.`);
    res.status(201).json({ assignment: binding });
  } catch (e: any) { fail(res, e.code === 11000 ? 409 : 500, e.message); }
});

router.get('/assignments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; const q: any = {};
    if (manager(u) || u.responsibilities?.includes('rnd_staff')) q.institution = u.institution;
    else q.$or = [{ student: u._id }, { faculty: u._id }];
    if (req.query.studentId && (manager(u) || u.responsibilities?.includes('rnd_staff'))) q.student = req.query.studentId;
    if (req.query.assignmentType) q.assignmentType = req.query.assignmentType;
    if (req.query.status) q.status = req.query.status;
    const assignments = await MentorshipBinding.find(q).populate('student','name email department').populate('faculty','name email department responsibilities').sort({ assignedAt: -1 });
    res.json({ assignments });
  } catch (e: any) { fail(res, 500, e.message); }
});

router.post('/assignments/:id/reassign', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; const old = await MentorshipBinding.findById(req.params.id);
    if (!old) return fail(res, 404, 'Assignment not found');
    if (!(manager(u) || u.responsibilities?.includes('rnd_staff')) || u.institution !== old.institution) return fail(res, 403, 'Institution R&D authority is required');
    const faculty = await User.findById(req.body.facultyId);
    if (!faculty || faculty.role !== 'faculty' || faculty.institution !== old.institution) return fail(res, 400, 'Replacement must be faculty in the same institution');
    old.status = 'transferred'; old.terminatedAt = new Date(); await old.save();
    let next: any;
    try {
      next = await MentorshipBinding.create({ student: old.student, faculty: faculty._id, assignmentType: old.assignmentType, collaborationId: old.collaborationId, department: old.department, institution: old.institution, collegeId: old.collegeId, status: 'active' });
    } catch (err) {
      old.status = 'active'; old.terminatedAt = undefined; await old.save(); throw err;
    }
    const paperQuery: any = { submittedBy: old.student, isStudentSubmission: true, lifecycleStatus: { $in: ['submitted','pending_proctor','pending_guide','rejected'] } };
    if (old.assignmentType === 'proctor') await ResearchPaper.updateMany(paperQuery, { $set: { assignedProctorId: faculty._id, lifecycleStatus: 'pending_proctor' } });
    else {
      const scoped = old.collaborationId ? { ...paperQuery, collaborationId: old.collaborationId } : { ...paperQuery, collaborationId: { $exists: false } };
      const papers = await ResearchPaper.find(scoped).select('_id assignedProjectGuideIds assignedProjectGuideId');
      for (const paper of papers) {
        const existing = (paper.assignedProjectGuideIds || []).filter(id => id.toString() !== old.faculty.toString());
        if (!existing.some(id => id.toString() === faculty._id.toString())) existing.push(faculty._id);
        await ResearchPaper.updateOne({ _id: paper._id }, { $set: { assignedProjectGuideIds: existing, assignedProjectGuideId: existing[0] || faculty._id, lifecycleStatus: 'pending_guide' } });
      }
    }
    await notify(u._id, [faculty._id, old.student], next._id.toString(), `Research reviewer assignment updated for ${old.student}.`);
    res.status(201).json({ previousAssignment: old, assignment: next });
  } catch (e: any) { fail(res, e.code === 11000 ? 409 : 500, e.message); }
});

router.get('/papers/mine', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!;
    const reviewScopes: any[] = [
      { assignedProctorId: u._id },
      { assignedProjectGuideIds: u._id },
      { assignedProjectGuideId: u._id },
    ];
    if (isInstitutionProctor(u, { institution: u.institution })) {
      reviewScopes.push({ isStudentSubmission: true, lifecycleStatus: 'pending_proctor' });
    }
    const papers = await ResearchPaper.find({
      institution: u.institution,
      $or: [{ submittedBy: u._id }, ...reviewScopes],
    }).sort({ updatedAt: -1 });
    res.json({ papers });
  } catch (e: any) { fail(res, 500, e.message); }
});

router.post('/papers/:id/resubmit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const p = await ResearchPaper.findById(req.params.id); if (!p) return fail(res, 404, 'Paper not found');
    if (!p.isStudentSubmission || p.submittedBy.toString() !== req.user!._id.toString() || p.lifecycleStatus !== 'rejected') return fail(res, 403, 'Only the author of a rejected student submission may resubmit');
    p.revisionRound = (p.revisionRound || 1) + 1; p.reviewHistory = p.reviewHistory || []; p.reviewHistory.push({ revisionRound: p.revisionRound, submittedAt: new Date(), submittedBy: req.user!._id as any });
    p.lifecycleStatus = 'published'; p.visibility = 'institution-only'; await p.save();
    const faculty = await User.find({ institution: p.institution, role: 'faculty', isActive: true }).select('_id');
    await notify(req.user!._id, faculty.map(x => x._id), `${p._id}:revision:${p.revisionRound}`, `Student research publication updated: ${p.title}`);
    res.json({ message: 'Research publication updated without review.', paper: p, revisionRound: p.revisionRound });
  } catch (e: any) { fail(res, 500, e.message); }
});

router.post('/papers/:id/reviews', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const p = await ResearchPaper.findById(req.params.id); if (!p) return fail(res, 404, 'Paper not found');
    if (!p.isStudentSubmission || !['pending_proctor','pending_guide'].includes(p.lifecycleStatus || '')) return fail(res, 409, 'Paper is not awaiting review');
    const u: any = req.user!; const reviewerId = u._id.toString();
    let role: 'proctor'|'project_guide'|null = null;
    if (p.lifecycleStatus === 'pending_proctor' && (
      p.assignedProctorId?.toString() === reviewerId || isInstitutionProctor(u, p)
    )) role = 'proctor';
    if (p.lifecycleStatus === 'pending_guide' && (p.assignedProjectGuideIds || []).some(x => x.toString() === reviewerId)) role = 'project_guide';
    if (!role) return fail(res, 403, 'You are not eligible to review the current stage');
    const alreadyReviewed = await ResearchReview.exists({ paperId: p._id, reviewerId: u._id, revisionRound: p.revisionRound || 1 });
    if (alreadyReviewed) return fail(res, 409, 'Reviewer already submitted a decision for this revision');
    const { verdict, comments, criteriaScores } = req.body;
    if (!['approved','changes_requested','rejected'].includes(verdict) || !String(comments || '').trim()) return fail(res, 400, 'A valid verdict and comments are required');
    const revisionRound = p.revisionRound || 1;
    const review = await ResearchReview.create({ paperId: p._id, reviewerId: u._id, reviewerRole: role, verdict, comments: String(comments).trim(), criteriaScores, revisionRound });
    if (verdict === 'rejected') p.lifecycleStatus = 'rejected';
    else if (verdict === 'changes_requested') p.lifecycleStatus = 'rejected';
    else if (role === 'proctor') p.lifecycleStatus = 'pending_guide';
    else {
      const guideIds = (p.assignedProjectGuideIds || (p.assignedProjectGuideId ? [p.assignedProjectGuideId] : [])).map(x => x.toString());
      const priorReviews = await ResearchReview.find({ paperId: p._id, revisionRound, reviewerRole: 'project_guide', verdict: { $in: ['rejected','changes_requested'] } });
      const approved = await ResearchReview.distinct('reviewerId', { paperId: p._id, revisionRound, reviewerRole: 'project_guide', verdict: 'approved' });
      if (!priorReviews.length && guideIds.every(x => approved.some(a => a.toString() === x))) p.lifecycleStatus = 'approved';
    }
    await p.save();
    const authorities = await User.find({ institution: p.institution, role: { $in: ['dean','principal','admin'] }, isActive: true }).select('_id');
    await notify(u._id, [p.submittedBy, ...(p.assignedProjectGuideIds || []), ...(p.assignedProctorId ? [p.assignedProctorId] : []), ...authorities.map(x => x._id)].filter(x => x.toString() !== reviewerId), `${p._id}:${revisionRound}:${role}:${review._id}`, `Research review update for "${p.title}": ${verdict}.`);
    res.status(201).json({ review, paper: p });
  } catch (e: any) { fail(res, e.code === 11000 ? 409 : 500, e.message); }
});

router.get('/papers/:id/reviews', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const p = await ResearchPaper.findById(req.params.id); if (!p) return fail(res, 404, 'Paper not found');
    const u: any = req.user!;
    const ownReview = await ResearchReview.exists({ paperId: p._id, reviewerId: u._id });
    const allowed = p.submittedBy.toString() === u._id.toString() || p.assignedProctorId?.toString() === u._id.toString() || (p.assignedProjectGuideIds || []).some(x => x.toString() === u._id.toString()) || (isInstitutionProctor(u, p) && (p.lifecycleStatus === 'pending_proctor' || Boolean(ownReview))) || manager(u);
    if (!allowed) return fail(res, 403, 'Not authorized to view review history');
    const reviews = await ResearchReview.find({ paperId: p._id }).populate('reviewerId','name role').sort({ revisionRound: 1, reviewedAt: 1 });
    res.json({ reviews });
  } catch (e: any) { fail(res, 500, e.message); }
});

router.post('/papers/:id/publish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const p = await ResearchPaper.findById(req.params.id); if (!p) return fail(res, 404, 'Paper not found');
    const u: any = req.user!;
    if (p.isStudentSubmission) {
      if (!manager(u)) return fail(res, 403, 'Only institutional authority may finalize student publication');
      if (p.lifecycleStatus !== 'approved') return fail(res, 409, 'Both Proctor and all assigned Project Guides must approve before publication');
    } else if (u.role !== 'faculty' || p.submittedBy.toString() !== u._id.toString()) return fail(res, 403, 'Only faculty authors can directly publish faculty research');
    p.lifecycleStatus = 'published'; p.visibility = req.body.visibility === 'institution-only' ? 'institution-only' : 'public'; await p.save();
    const recipients = await User.find({ institution: p.institution, role: { $in: ['dean','principal','admin'] }, isActive: true }).select('_id');
    await notify(u._id, recipients.map(x => x._id), p._id.toString(), `Research publication is live: ${p.title}`);
    res.json({ paper: p });
  } catch (e: any) { fail(res, 500, e.message); }
});

router.post('/collaborations/:id/applications/:applicationId/review', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const c = await ResearchCollaboration.findById(req.params.id); if (!c) return fail(res, 404, 'Research project not found');
    const u: any = req.user!; if (c.leadResearcher.toString() !== u._id.toString() && c.supervisor?.toString() !== u._id.toString() && !manager(u)) return fail(res, 403, 'Only project leadership or institutional authority can review applications');
    const app: any = c.applications.find((x: any) => x._id.toString() === req.params.applicationId); if (!app) return fail(res, 404, 'Application not found');
    const { status, reviewerNotes } = req.body; if (!['shortlisted','accepted','declined'].includes(status)) return fail(res, 400, 'Invalid application status');
    app.status = status; app.reviewerNotes = String(reviewerNotes || ''); app.reviewedAt = new Date();
    if (status === 'accepted') {
      const openRole: any = c.openRoles.find((x: any) => x.roleTitle === app.roleSought);
      if (!openRole || openRole.filled >= openRole.vacancies) return fail(res, 409, 'No vacancy remains for this role');
      if (!c.teamMembers.some((x: any) => x.user.toString() === app.applicant.toString())) c.teamMembers.push({ user: app.applicant, role: app.roleSought, joinedAt: new Date() } as any);
      openRole.filled += 1;
      if (c.openRoles.length && c.openRoles.every((x: any) => x.filled >= x.vacancies)) c.status = 'in_progress';
    }
    await c.save(); await notify(u._id, [app.applicant], `${c._id}:${app._id}`, `Your application to ${c.title} was ${status}.`);
    res.json({ collaboration: c, application: app });
  } catch (e: any) { fail(res, 500, e.message); }
});

export default router;
