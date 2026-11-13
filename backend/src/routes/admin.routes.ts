import { Router, Response } from 'express';
import { User } from '../models/User.js';
import { Post } from '../models/Post.js';
import { Community } from '../models/Community.js';
import { Opportunity } from '../models/Opportunity.js';
import { Report } from '../models/Report.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AuditLog } from '../models/AuditLog.js';
import { writeAudit, verifyAuditChain } from '../services/audit.service.js';
import { ResearchPaper } from '../models/ResearchPaper.js';
import { Event } from '../models/Event.js';

const router = Router();

// Submit a report (any authenticated user)
router.post('/reports', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { targetType, targetId, reason } = req.body;
  if (!targetType || !targetId || !reason) {
    res.status(400).json({ message: 'targetType, targetId, and reason are required.' });
    return;
  }
  if (!['post','user','community'].includes(targetType)) { res.status(400).json({ message: 'Invalid target type.' }); return; }
  const report = await Report.create({ reporter: req.user!._id, targetType, targetId, reason });
  res.status(201).json({ message: 'Report submitted.', report });
}));

// Admin: platform stats
router.get('/stats', authenticate, requireRole(['admin', 'superadmin']), asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [totalUsers, totalPosts, totalCommunities, totalOpportunities, pendingReports] = await Promise.all([
    User.countDocuments(),
    Post.countDocuments(),
    Community.countDocuments(),
    Opportunity.countDocuments(),
    Report.countDocuments({ status: 'pending' })
  ]);
  const rolesBreakdown = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
  const responsibilitiesBreakdown = await User.aggregate([
    { $unwind: '$responsibilities' },
    { $group: { _id: '$responsibilities', count: { $sum: 1 } } }
  ]);
  const institutionsBreakdown = await User.aggregate([
    { $group: { _id: '$institution', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  res.json({ stats: { totalUsers, totalPosts, totalCommunities, totalOpportunities, pendingReports, rolesBreakdown, responsibilitiesBreakdown, institutionsBreakdown } });
}));

router.get('/institution/stats', authenticate, requireRole(['dean','principal','admin','superadmin']), asyncHandler(async (req: AuthRequest, res: Response) => {
  if (['dean','principal'].includes(req.user!.role) && req.query.institution && req.query.institution !== req.user!.institution) { res.status(403).json({ message: 'Institution scope mismatch.' }); return; }
  const scope: any = req.user!.role === 'superadmin' || req.user!.role === 'admin' ? (req.query.institution ? { institution: String(req.query.institution) } : {}) : { institution: req.user!.institution };
  const scopedCommunities = scope.institution ? await Community.find({ $or: [{ institution: scope.institution }, { creator: { $in: await User.find(scope).distinct('_id') } }] }).distinct('_id') : undefined;
  const [users, posts, communities, opportunities, papers, events, reports] = await Promise.all([
    User.countDocuments(scope), Post.countDocuments(scope), scopedCommunities ? scopedCommunities.length : Community.countDocuments(), Opportunity.countDocuments(scope), ResearchPaper.countDocuments(scope), Event.countDocuments(scope), Report.countDocuments({ status: 'pending' })
  ]);
  res.json({ institution: scope.institution || 'platform', analytics: { users, posts, communities, opportunities, researchPapers: papers, events, pendingReports: reports } });
}));

// Admin/Dean/Principal: list users with filters (dean/principal scoped to own institution)
router.get('/users', authenticate, requireRole(['admin', 'superadmin', 'dean', 'principal']), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { role, institution, isActive, page = 1, limit = 20 } = req.query as any;
  const filter: any = {};
  if (req.user!.role === 'dean' || req.user!.role === 'principal') {
    filter.institution = req.user!.institution;
  } else if (institution) {
    filter.institution = { $regex: institution, $options: 'i' };
  }
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).select('-password -emailVerificationToken -passwordResetToken').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    User.countDocuments(filter)
  ]);
  res.json({ users, total, page: Number(page), limit: Number(limit) });
}));

// Admin: verify / unverify user
router.put('/users/:id/verify', authenticate, requireRole(['admin', 'superadmin','dean','principal']), asyncHandler(async (req: AuthRequest, res: Response) => {
  const before = await User.findById(req.params.id); if (!before) { res.status(404).json({ message: 'User not found.' }); return; }
  if (!['admin','superadmin'].includes(req.user!.role) && before.institution !== req.user!.institution) { res.status(403).json({ message: 'Institution scope mismatch.' }); return; }
  const previous = { isVerified: before.isVerified }; before.isVerified = Boolean(req.body.isVerified); await before.save();
  await writeAudit(req.user!, 'user.verify', 'User', before._id, previous, { isVerified: before.isVerified }, String(req.body.reason || ''), req);
  res.json({ message: 'Verification updated.', user: before });
}));

router.put('/users/:id/role', authenticate, requireRole(['admin','superadmin']), asyncHandler(async (req: AuthRequest, res: Response) => {
  const allowed = ['student','alumni','faculty','dean','principal','admin']; if (!allowed.includes(req.body.role)) { res.status(400).json({ message: 'Invalid role.' }); return; }
  const target = await User.findById(req.params.id); if (!target) { res.status(404).json({ message: 'User not found.' }); return; }
  if (!['admin','superadmin'].includes(req.user!.role) && target.institution !== req.user!.institution) { res.status(403).json({ message: 'Institution scope mismatch.' }); return; }
  const old = { role: target.role }; target.role = req.body.role; await target.save(); await writeAudit(req.user!, 'user.role.assign', 'User', target._id, old, { role: target.role }, String(req.body.reason || ''), req); res.json({ user: target });
}));
router.put('/users/:id/responsibilities', authenticate, requireRole(['admin','superadmin','dean','principal']), asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await User.findById(req.params.id); if (!target) { res.status(404).json({ message: 'User not found.' }); return; }
  if (!['admin','superadmin'].includes(req.user!.role) && target.institution !== req.user!.institution) { res.status(403).json({ message: 'Institution scope mismatch.' }); return; }
  const allowed = ['proctor','project_guide','rnd_staff','placement_coordinator','club_advisor','timetable_coordinator']; const values = req.body.responsibilities;
  if (!Array.isArray(values) || values.some((x: string) => !allowed.includes(x))) { res.status(400).json({ message: 'Invalid responsibilities.' }); return; }
  const old = { responsibilities: target.responsibilities }; target.responsibilities = [...new Set(values)]; await target.save(); await writeAudit(req.user!, 'user.responsibilities.assign', 'User', target._id, old, { responsibilities: target.responsibilities }, String(req.body.reason || ''), req); res.json({ user: target });
}));
router.put('/users/:id/status', authenticate, requireRole(['admin','superadmin','dean','principal']), asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await User.findById(req.params.id); if (!target) { res.status(404).json({ message: 'User not found.' }); return; }
  if (!['admin','superadmin'].includes(req.user!.role) && target.institution !== req.user!.institution) { res.status(403).json({ message: 'Institution scope mismatch.' }); return; }
  const active = Boolean(req.body.isActive); const reason = String(req.body.reason || '').trim(); if (!active && !reason) { res.status(400).json({ message: 'A suspension reason is required.' }); return; }
  const before = { isActive: target.isActive, disciplinaryStatus: target.disciplinaryStatus, tokenVersion: target.tokenVersion };
  target.isActive = active; target.disciplinaryStatus = active ? 'good_standing' : 'suspended'; target.tokenVersion += 1; await target.save();
  await writeAudit(req.user!, active ? 'user.reactivate' : 'user.suspend', 'User', target._id, before, { isActive: target.isActive, disciplinaryStatus: target.disciplinaryStatus, tokenVersion: target.tokenVersion }, reason, req); res.json({ user: target });
}));
router.post('/users/:id/disciplinary', authenticate, requireRole(['admin','superadmin','dean','principal']), asyncHandler(async (req: AuthRequest, res: Response) => {
  const target = await User.findById(req.params.id); if (!target) { res.status(404).json({ message: 'User not found.' }); return; }
  if (!['admin','superadmin'].includes(req.user!.role) && target.institution !== req.user!.institution) { res.status(403).json({ message: 'Institution scope mismatch.' }); return; }
  if (!['good_standing','warning','probation','suspended'].includes(req.body.status) || !req.body.reason) { res.status(400).json({ message: 'Valid status and reason required.' }); return; }
  const old = { disciplinaryStatus: target.disciplinaryStatus }; target.disciplinaryStatus = req.body.status; if (target.disciplinaryStatus === 'suspended') { target.isActive = false; target.tokenVersion += 1; } await target.save();
  await writeAudit(req.user!, 'user.disciplinary.change', 'User', target._id, old, { disciplinaryStatus: target.disciplinaryStatus }, String(req.body.reason), req); res.json({ user: target });
}));

// Admin: list reports
router.get('/reports', authenticate, requireRole(['admin', 'superadmin','dean','principal']), asyncHandler(async (req: AuthRequest, res: Response) => {
  const allReports = await Report.find().populate('reporter', 'name email institution role').sort({ createdAt: -1 });
  const reports = ['admin','superadmin'].includes(req.user!.role) ? allReports : allReports.filter((r: any) => r.reporter?.institution === req.user!.institution);
  res.json({ reports });
}));

// Admin: resolve report
router.put('/reports/:id', authenticate, requireRole(['admin', 'superadmin','dean','principal']), asyncHandler(async (req: AuthRequest, res: Response) => {
  const raw = req.body.status || req.body.action;
  const status = raw === 'dismissed' || raw === 'dismiss' ? 'dismissed' : 'resolved';
  const report = await Report.findById(req.params.id);
  if (!report) { res.status(404).json({ message: 'Report not found.' }); return; }
  const reporter = await User.findById(report.reporter); if (!['admin','superadmin'].includes(req.user!.role) && reporter?.institution !== req.user!.institution) { res.status(403).json({ message: 'Institution scope mismatch.' }); return; }
  const previous = { status: report.status }; report.status = status; await report.save(); await writeAudit(req.user!, 'report.review', 'Report', report._id, previous, { status: report.status }, String(req.body.reason || ''), req);
  res.json({ message: `Report ${status}.`, report });
}));

router.get('/audit', authenticate, requireRole(['admin','superadmin','dean','principal']), asyncHandler(async (req: AuthRequest, res: Response) => {
  const filter: any = {}; if (!['admin','superadmin'].includes(req.user!.role)) filter.institution = req.user!.institution;
  const entries = await AuditLog.find(filter).sort({ sequence: -1 }).limit(Math.min(200, Number(req.query.limit) || 50)).lean(); res.json({ entries });
}));
router.get('/audit/verify', authenticate, requireRole(['admin','superadmin']), asyncHandler(async (_req: AuthRequest, res: Response) => { res.json(await verifyAuditChain()); }));

router.put('/posts/:id/moderate', authenticate, requireRole(['admin','superadmin','dean','principal']), asyncHandler(async (req: AuthRequest, res: Response) => {
  const post = await Post.findById(req.params.id); if (!post) { res.status(404).json({ message: 'Post not found.' }); return; }
  if (!['admin','superadmin'].includes(req.user!.role) && post.institution !== req.user!.institution) { res.status(403).json({ message: 'Institution scope mismatch.' }); return; }
  const previous = { visibility: post.visibility, isPinned: post.isPinned }; if (req.body.visibility && !['public','institution-only'].includes(req.body.visibility)) { res.status(400).json({ message: 'Invalid visibility.' }); return; }
  if (req.body.visibility) post.visibility = req.body.visibility; if (typeof req.body.isPinned === 'boolean') post.isPinned = req.body.isPinned; await post.save();
  await writeAudit(req.user!, 'post.moderate', 'Post', post._id, previous, { visibility: post.visibility, isPinned: post.isPinned }, String(req.body.reason || ''), req); res.json({ post });
}));
router.put('/communities/:id/moderate', authenticate, requireRole(['admin','superadmin','dean','principal']), asyncHandler(async (req: AuthRequest, res: Response) => {
  const community = await Community.findById(req.params.id); if (!community) { res.status(404).json({ message: 'Community not found.' }); return; }
  if (!['admin','superadmin'].includes(req.user!.role) && community.institution !== req.user!.institution) { res.status(403).json({ message: 'Institution scope mismatch.' }); return; }
  const previous = { requiresApproval: community.requiresApproval }; if (typeof req.body.requiresApproval === 'boolean') community.requiresApproval = req.body.requiresApproval; await community.save();
  await writeAudit(req.user!, 'community.moderate', 'Community', community._id, previous, { requiresApproval: community.requiresApproval }, String(req.body.reason || ''), req); res.json({ community });
}));

export default router;
