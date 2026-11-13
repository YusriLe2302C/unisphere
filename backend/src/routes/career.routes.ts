import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { CareerQuestion } from '../models/CareerQuestion.js';
import { Connection, getCanonicalPair } from '../models/Connection.js';
import { MentorshipRequest } from '../models/MentorshipRequest.js';
import { UploadedFile } from '../models/UploadedFile.js';
import { DeliveryService } from '../services/delivery.service.js';
import { Opportunity } from '../models/Opportunity.js';
import { Application } from '../models/Application.js';

const router = Router();
const fail = (res: Response, status: number, message: string) => res.status(status).json({ message });
const authority = (u: any) => ['dean','principal','admin','superadmin'].includes(u.role);
const coord = (u: any) => authority(u) || u.responsibilities?.includes('placement_coordinator');
const notify = (sender: any, users: any[], entityId: string, message: string, type: any = 'system') => DeliveryService.deliverContentNotification({ senderId: sender, specificRecipients: users, type, entityId, message });
const privateParticipant = (q: any, id: string) => q.author.toString() === id || q.assignedMentor?.toString() === id || (q.answers || []).some((a: any) => a.responder.toString() === id) || (q.followUps || []).some((f: any) => f.author.toString() === id);

// Placement drive lifecycle.
router.put('/placement/opportunities/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; const o = await Opportunity.findById(req.params.id); if (!o) return fail(res, 404, 'Opportunity not found');
    if (!o.isPlacementDrive || !(coord(u) && (authority(u) || u.institution === o.institution))) return fail(res, 403, 'Placement Coordinator or institutional authority in the same institution is required');
    const keys = ['companyDetails','minimumCgpa','eligibleBranches','eligibleBatches','requiredSkills','requiresResume','package','location','description','applicationDeadline','isActive','title'];
    for (const k of keys) if (req.body[k] !== undefined) (o as any)[k] = req.body[k];
    await o.save(); res.json({ opportunity: o });
  } catch (e: any) { fail(res, 500, e.message); }
});

router.get('/placement/opportunities/:id/applications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; const o = await Opportunity.findById(req.params.id); if (!o) return fail(res, 404, 'Opportunity not found');
    if (!o.isPlacementDrive || !(coord(u) && (authority(u) || u.institution === o.institution))) return fail(res, 403, 'Placement oversight permission is required');
    res.json({ applications: await Application.find({ opportunity: o._id }).populate('applicant','name email department batch graduationYear cgpa skills').sort({ createdAt: -1 }) });
  } catch (e: any) { fail(res, 500, e.message); }
});

router.put('/placement/applications/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; const app: any = await Application.findById(req.params.id).populate('opportunity'); if (!app) return fail(res, 404, 'Application not found');
    const o: any = app.opportunity; if (!o.isPlacementDrive || !(coord(u) && (authority(u) || u.institution === o.institution))) return fail(res, 403, 'Placement Coordinator or institutional authority is required');
    if (req.body.status && !['applied','under_review','shortlisted','accepted','rejected','withdrawn'].includes(req.body.status)) return fail(res, 400, 'Invalid application status');
    if (req.body.status) { app.status = req.body.status; app.history.push({ status: req.body.status, changedBy: u._id, note: req.body.reviewerNotes || '', changedAt: new Date() }); }
    if (req.body.selectionStatus) { if (!['pending','selected','not_selected','waitlisted'].includes(req.body.selectionStatus)) return fail(res, 400, 'Invalid selection status'); app.selectionStatus = req.body.selectionStatus; }
    if (req.body.offerStatus) { if (!['not_issued','issued','accepted','declined','expired'].includes(req.body.offerStatus)) return fail(res, 400, 'Invalid offer status'); app.offerStatus = req.body.offerStatus; }
    if (Array.isArray(req.body.interviewRounds)) app.interviewRounds = req.body.interviewRounds;
    if (req.body.reviewerNotes !== undefined) app.reviewerNotes = req.body.reviewerNotes;
    await app.save(); await notify(u._id, [app.applicant], `${app._id}:${app.updatedAt.getTime()}`, `Placement application update for ${o.title}.`, 'opportunity');
    res.json({ application: app });
  } catch (e: any) { fail(res, 500, e.message); }
});

// Alumni professional profiles and discovery.
router.put('/alumni/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'alumni') return fail(res, 403, 'Alumni only');
    const allowed = ['company','designation','industry','yearsExperience','mentorshipInterests']; const profile: any = {};
    for (const k of allowed) if (req.body[k] !== undefined) profile[k] = req.body[k];
    const user: any = await User.findByIdAndUpdate(req.user!._id, { $set: { alumniProfile: profile, ...(req.body.skills ? { skills: req.body.skills } : {}) } }, { new: true }).select('name institution headline department skills alumniProfile');
    res.json({ profile: user });
  } catch (e: any) { fail(res, 500, e.message); }
});
router.get('/alumni', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const q: any = { role: 'alumni', isActive: true, institution: req.user!.institution };
    for (const k of ['industry','company','designation']) if (req.query[k]) q[`alumniProfile.${k}`] = { $regex: String(req.query[k]), $options: 'i' };
    if (req.query.skill) q.skills = { $in: [new RegExp(String(req.query.skill), 'i')] };
    const alumni = await User.find(q).select('name avatar headline institution department skills alumniProfile').limit(Math.min(Number(req.query.limit) || 50, 100));
    res.json({ alumni });
  } catch (e: any) { fail(res, 500, e.message); }
});

// Institution-visible discussions; private mentor threads only return to participants.
router.get('/questions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; const q: any = { institution: u.institution, $or: [{ visibility: 'public' }, { author: u._id }, { assignedMentor: u._id }, { 'answers.responder': u._id }, { 'followUps.author': u._id }] };
    const questions = await CareerQuestion.find(q).populate('author','name role avatar').populate('assignedMentor','name role avatar').sort({ createdAt: -1 });
    res.json({ questions });
  } catch (e: any) { fail(res, 500, e.message); }
});
router.post('/questions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; const { title, body, visibility = 'public', assignedMentor, tags = [], targetDepartments = [], attachmentIds = [] } = req.body;
    if (!title || !body || !['public','private_to_mentor'].includes(visibility)) return fail(res, 400, 'title, body, and valid visibility are required');
    if (visibility === 'private_to_mentor' && (!assignedMentor || !Types.ObjectId.isValid(assignedMentor))) return fail(res, 400, 'Private inquiries require an assigned alumni mentor');
    if (visibility === 'private_to_mentor') {
      const mentor = await User.findOne({ _id: assignedMentor, role: 'alumni', institution: u.institution }); if (!mentor) return fail(res, 404, 'Alumni mentor not found');
    }
    const files = attachmentIds.length ? await UploadedFile.find({ _id: { $in: attachmentIds }, uploaderId: u._id, associatedEntityType: 'career_question', accessPolicy: 'private', isQuarantined: false, virusScanClean: true }) : [];
    if (files.length !== new Set(attachmentIds.map(String)).size) return fail(res, 403, 'Question attachments must be clean files uploaded by the author');
    if (visibility === 'private_to_mentor' && files.some((f: any) => !['private','restricted'].includes(f.accessPolicy))) return fail(res, 400, 'Private mentor attachments must use private or restricted file access');
    const question = await CareerQuestion.create({ author: u._id, assignedMentor: visibility === 'private_to_mentor' ? assignedMentor : undefined, visibility, title, body, tags, targetDepartments, institution: u.institution, attachmentIds });
    if (attachmentIds.length) await UploadedFile.updateMany({ _id: { $in: attachmentIds }, uploaderId: u._id }, { $set: { associatedEntityId: question._id, accessPolicy: 'private', institution: u.institution, allowedUserIds: [u._id, ...(visibility === 'private_to_mentor' ? [assignedMentor] : [])] } });
    if (assignedMentor) await notify(u._id, [assignedMentor], question._id.toString(), `Private career question: ${title}`);
    res.status(201).json({ question });
  } catch (e: any) { fail(res, 500, e.message); }
});
router.get('/questions/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const q = await CareerQuestion.findById(req.params.id).select('+attachmentIds').populate('author','name role avatar').populate('assignedMentor','name role avatar').populate('answers.responder','name role avatar');
    if (!q) return fail(res, 404, 'Question not found');
    if (q.visibility === 'private_to_mentor' && (q.institution !== req.user!.institution || !privateParticipant(q, req.user!._id.toString()))) return fail(res, 404, 'Question not found');
    if (q.visibility === 'public' && q.institution !== req.user!.institution) return fail(res, 404, 'Question not found');
    const attachments = q.attachmentIds?.length ? await UploadedFile.find({ _id: { $in: q.attachmentIds }, institution: q.institution, isQuarantined: false, virusScanClean: true, ...(q.visibility === 'private_to_mentor' ? { accessPolicy: { $in: ['private','restricted'] }, allowedUserIds: req.user!._id } : {}) }).select('_id originalFileName mimeType fileSizeBytes fileUrl') : [];
    res.json({ question: q, attachments });
  } catch (e: any) { fail(res, 500, e.message); }
});
router.post('/questions/:id/answers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const q = await CareerQuestion.findById(req.params.id); if (!q) return fail(res, 404, 'Question not found');
    const u: any = req.user!; const isPrivateParticipant = q.visibility === 'private_to_mentor' && q.assignedMentor?.toString() === u._id.toString();
    const canAnswer = q.visibility === 'private_to_mentor' ? isPrivateParticipant && u.role === 'alumni' : u.role === 'alumni' || authority(u);
    if (q.institution !== u.institution || q.isClosed || !canAnswer) return fail(res, 403, 'Not authorized to answer this question');
    if (!String(req.body.content || '').trim()) return fail(res, 400, 'Answer content required');
    q.answers.push({ responder: u._id, content: String(req.body.content).trim(), isVerifiedFaculty: false, isEndorsed: false } as any); await q.save();
    await notify(u._id, [q.author], q._id.toString(), `An alumni answered your career question: ${q.title}`);
    res.status(201).json({ answer: q.answers[q.answers.length - 1] });
  } catch (e: any) { fail(res, 500, e.message); }
});
router.post('/questions/:id/followups', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const q = await CareerQuestion.findById(req.params.id); if (!q) return fail(res, 404, 'Question not found');
    const u: any = req.user!; if (q.institution !== u.institution || q.visibility === 'private_to_mentor' && !privateParticipant(q, u._id.toString())) return fail(res, 404, 'Question not found');
    if (!String(req.body.content || '').trim()) return fail(res, 400, 'Follow-up content required');
    q.followUps.push({ author: u._id, content: String(req.body.content).trim(), createdAt: new Date() } as any); await q.save();
    const recipients = [q.author, q.assignedMentor].filter((x: any) => x && x.toString() !== u._id.toString());
    await notify(u._id, recipients, q._id.toString(), `New follow-up on "${q.title}"`);
    res.status(201).json({ followUps: q.followUps });
  } catch (e: any) { fail(res, 500, e.message); }
});

// Bidirectional unique connection lifecycle.
router.get('/connections', authenticate, async (req: AuthRequest, res: Response) => {
  try { const rows = await Connection.find({ $or: [{ requester: req.user!._id }, { recipient: req.user!._id }] }).populate('requester','name avatar role').populate('recipient','name avatar role').sort({ updatedAt: -1 }); res.json({ connections: rows }); }
  catch (e: any) { fail(res, 500, e.message); }
});
router.post('/connections/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const target = await User.findById(req.params.userId); if (!target || target.role !== 'alumni' || target.institution !== req.user!.institution) return fail(res, 404, 'Alumni profile not found');
    if (target._id.equals(req.user!._id)) return fail(res, 400, 'Cannot connect to yourself');
    const canonicalPair = getCanonicalPair(req.user!._id, target._id); const existing = await Connection.findOne({ canonicalPair });
    if (existing) {
      if (existing.status === 'accepted' || existing.status === 'pending' && existing.requester.toString() === req.user!._id.toString()) return res.json({ connection: existing, idempotentReplay: true });
      if (existing.status === 'pending' || existing.status === 'blocked') return fail(res, 409, 'Connection already exists or is blocked');
      existing.requester = req.user!._id as any; existing.recipient = target._id; existing.status = 'pending'; existing.actionBy = undefined; await existing.save();
      await notify(req.user!._id, [target._id], existing._id.toString(), 'You received a career connection request.'); return res.status(201).json({ connection: existing });
    }
    const connection = await Connection.create({ canonicalPair, requester: req.user!._id, recipient: target._id, status: 'pending' });
    await notify(req.user!._id, [target._id], connection._id.toString(), 'You received a career connection request.'); res.status(201).json({ connection });
  } catch (e: any) { fail(res, e.code === 11000 ? 409 : 500, e.message); }
});
router.put('/connections/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const c = await Connection.findById(req.params.id); if (!c) return fail(res, 404, 'Connection not found');
    if (c.recipient.toString() !== req.user!._id.toString() || c.status !== 'pending') return fail(res, 403, 'Only the request recipient may accept or reject a pending request');
    if (!['accepted','declined'].includes(req.body.status)) return fail(res, 400, 'status must be accepted or declined');
    c.status = req.body.status; c.actionBy = req.user!._id as any; await c.save(); await notify(req.user!._id, [c.requester], c._id.toString(), `Your connection request was ${c.status}.`); res.json({ connection: c });
  } catch (e: any) { fail(res, 500, e.message); }
});
router.delete('/connections/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try { const c = await Connection.findById(req.params.id); if (!c) return fail(res, 404, 'Connection not found'); if (![c.requester.toString(),c.recipient.toString()].includes(req.user!._id.toString())) return fail(res, 403, 'Not a connection participant'); await c.deleteOne(); res.json({ removed: true }); }
  catch (e: any) { fail(res, 500, e.message); }
});

// Private student-to-alumni mentor requests and private responses.
router.get('/mentorship/requests', authenticate, async (req: AuthRequest, res: Response) => {
  try { const q = await MentorshipRequest.find({ $or: [{ student: req.user!._id }, { mentor: req.user!._id }] }).populate('student','name avatar institution').populate('mentor','name avatar alumniProfile'); res.json({ requests: q }); }
  catch (e: any) { fail(res, 500, e.message); }
});
router.post('/mentorship/requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const u: any = req.user!; if (u.role !== 'student') return fail(res, 403, 'Students only');
    const mentor = await User.findOne({ _id: req.body.mentorId, role: 'alumni', institution: u.institution, isActive: true }); if (!mentor) return fail(res, 404, 'Alumni mentor not found');
    if (!req.body.subject || !req.body.message) return fail(res, 400, 'subject and message are required');
    const active = await MentorshipRequest.findOne({ student: u._id, mentor: mentor._id, status: 'pending' }); if (active) return res.json({ request: active, idempotentReplay: true });
    const request = await MentorshipRequest.create({ student: u._id, mentor: mentor._id, subject: req.body.subject, message: req.body.message, goals: req.body.goals || [] });
    await notify(u._id, [mentor._id], request._id.toString(), 'A student sent you a private mentorship request.'); res.status(201).json({ request });
  } catch (e: any) { fail(res, e.code === 11000 ? 409 : 500, e.message); }
});
router.put('/mentorship/requests/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const r = await MentorshipRequest.findById(req.params.id); if (!r) return fail(res, 404, 'Request not found');
    const u: any = req.user!; const mentorOwns = r.mentor.toString() === u._id.toString(); const studentOwns = r.student.toString() === u._id.toString();
    if (!mentorOwns && !studentOwns) return fail(res, 404, 'Request not found');
    if (mentorOwns) {
      if (u.role !== 'alumni' || !['accepted','declined'].includes(req.body.status)) return fail(res, 403, 'Alumni mentor may accept or decline');
      r.status = req.body.status; r.responseNote = String(req.body.responseNote || ''); r.respondedAt = new Date();
      if (req.body.responseMessage !== undefined) r.responseMessage = String(req.body.responseMessage);
    } else if (req.body.status === 'cancelled' && r.status === 'pending') r.status = 'cancelled';
    else return fail(res, 403, 'Students may cancel only their pending requests');
    await r.save(); await notify(u._id, [mentorOwns ? r.student : r.mentor], r._id.toString(), `Mentorship request ${r.status}.`); res.json({ request: r });
  } catch (e: any) { fail(res, 500, e.message); }
});

export default router;
