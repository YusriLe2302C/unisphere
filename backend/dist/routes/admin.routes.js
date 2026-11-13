"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_js_1 = require("../models/User.js");
const Post_js_1 = require("../models/Post.js");
const Community_js_1 = require("../models/Community.js");
const Opportunity_js_1 = require("../models/Opportunity.js");
const Report_js_1 = require("../models/Report.js");
const auth_js_1 = require("../middleware/auth.js");
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const AuditLog_js_1 = require("../models/AuditLog.js");
const audit_service_js_1 = require("../services/audit.service.js");
const ResearchPaper_js_1 = require("../models/ResearchPaper.js");
const Event_js_1 = require("../models/Event.js");
const router = (0, express_1.Router)();
// Submit a report (any authenticated user)
router.post('/reports', auth_js_1.authenticate, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId || !reason) {
        res.status(400).json({ message: 'targetType, targetId, and reason are required.' });
        return;
    }
    if (!['post', 'user', 'community'].includes(targetType)) {
        res.status(400).json({ message: 'Invalid target type.' });
        return;
    }
    const report = await Report_js_1.Report.create({ reporter: req.user._id, targetType, targetId, reason });
    res.status(201).json({ message: 'Report submitted.', report });
}));
// Admin: platform stats
router.get('/stats', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin']), (0, asyncHandler_js_1.asyncHandler)(async (_req, res) => {
    const [totalUsers, totalPosts, totalCommunities, totalOpportunities, pendingReports] = await Promise.all([
        User_js_1.User.countDocuments(),
        Post_js_1.Post.countDocuments(),
        Community_js_1.Community.countDocuments(),
        Opportunity_js_1.Opportunity.countDocuments(),
        Report_js_1.Report.countDocuments({ status: 'pending' })
    ]);
    const rolesBreakdown = await User_js_1.User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const responsibilitiesBreakdown = await User_js_1.User.aggregate([
        { $unwind: '$responsibilities' },
        { $group: { _id: '$responsibilities', count: { $sum: 1 } } }
    ]);
    const institutionsBreakdown = await User_js_1.User.aggregate([
        { $group: { _id: '$institution', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);
    res.json({ stats: { totalUsers, totalPosts, totalCommunities, totalOpportunities, pendingReports, rolesBreakdown, responsibilitiesBreakdown, institutionsBreakdown } });
}));
router.get('/institution/stats', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['dean', 'principal', 'admin', 'superadmin']), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    if (['dean', 'principal'].includes(req.user.role) && req.query.institution && req.query.institution !== req.user.institution) {
        res.status(403).json({ message: 'Institution scope mismatch.' });
        return;
    }
    const scope = req.user.role === 'superadmin' || req.user.role === 'admin' ? (req.query.institution ? { institution: String(req.query.institution) } : {}) : { institution: req.user.institution };
    const scopedCommunities = scope.institution ? await Community_js_1.Community.find({ $or: [{ institution: scope.institution }, { creator: { $in: await User_js_1.User.find(scope).distinct('_id') } }] }).distinct('_id') : undefined;
    const [users, posts, communities, opportunities, papers, events, reports] = await Promise.all([
        User_js_1.User.countDocuments(scope), Post_js_1.Post.countDocuments(scope), scopedCommunities ? scopedCommunities.length : Community_js_1.Community.countDocuments(), Opportunity_js_1.Opportunity.countDocuments(scope), ResearchPaper_js_1.ResearchPaper.countDocuments(scope), Event_js_1.Event.countDocuments(scope), Report_js_1.Report.countDocuments({ status: 'pending' })
    ]);
    res.json({ institution: scope.institution || 'platform', analytics: { users, posts, communities, opportunities, researchPapers: papers, events, pendingReports: reports } });
}));
// Admin/Dean/Principal: list users with filters (dean/principal scoped to own institution)
router.get('/users', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { role, institution, isActive, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (req.user.role === 'dean' || req.user.role === 'principal') {
        filter.institution = req.user.institution;
    }
    else if (institution) {
        filter.institution = { $regex: institution, $options: 'i' };
    }
    if (role)
        filter.role = role;
    if (isActive !== undefined)
        filter.isActive = isActive === 'true';
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
        User_js_1.User.find(filter).select('-password -emailVerificationToken -passwordResetToken').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
        User_js_1.User.countDocuments(filter)
    ]);
    res.json({ users, total, page: Number(page), limit: Number(limit) });
}));
// Admin: verify / unverify user
router.put('/users/:id/verify', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const before = await User_js_1.User.findById(req.params.id);
    if (!before) {
        res.status(404).json({ message: 'User not found.' });
        return;
    }
    if (!['admin', 'superadmin'].includes(req.user.role) && before.institution !== req.user.institution) {
        res.status(403).json({ message: 'Institution scope mismatch.' });
        return;
    }
    const previous = { isVerified: before.isVerified };
    before.isVerified = Boolean(req.body.isVerified);
    await before.save();
    await (0, audit_service_js_1.writeAudit)(req.user, 'user.verify', 'User', before._id, previous, { isVerified: before.isVerified }, String(req.body.reason || ''), req);
    res.json({ message: 'Verification updated.', user: before });
}));
router.put('/users/:id/role', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin']), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const allowed = ['student', 'alumni', 'faculty', 'dean', 'principal', 'admin'];
    if (!allowed.includes(req.body.role)) {
        res.status(400).json({ message: 'Invalid role.' });
        return;
    }
    const target = await User_js_1.User.findById(req.params.id);
    if (!target) {
        res.status(404).json({ message: 'User not found.' });
        return;
    }
    if (!['admin', 'superadmin'].includes(req.user.role) && target.institution !== req.user.institution) {
        res.status(403).json({ message: 'Institution scope mismatch.' });
        return;
    }
    const old = { role: target.role };
    target.role = req.body.role;
    await target.save();
    await (0, audit_service_js_1.writeAudit)(req.user, 'user.role.assign', 'User', target._id, old, { role: target.role }, String(req.body.reason || ''), req);
    res.json({ user: target });
}));
router.put('/users/:id/responsibilities', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const target = await User_js_1.User.findById(req.params.id);
    if (!target) {
        res.status(404).json({ message: 'User not found.' });
        return;
    }
    if (!['admin', 'superadmin'].includes(req.user.role) && target.institution !== req.user.institution) {
        res.status(403).json({ message: 'Institution scope mismatch.' });
        return;
    }
    const allowed = ['proctor', 'project_guide', 'rnd_staff', 'placement_coordinator', 'club_advisor', 'timetable_coordinator'];
    const values = req.body.responsibilities;
    if (!Array.isArray(values) || values.some((x) => !allowed.includes(x))) {
        res.status(400).json({ message: 'Invalid responsibilities.' });
        return;
    }
    const old = { responsibilities: target.responsibilities };
    target.responsibilities = [...new Set(values)];
    await target.save();
    await (0, audit_service_js_1.writeAudit)(req.user, 'user.responsibilities.assign', 'User', target._id, old, { responsibilities: target.responsibilities }, String(req.body.reason || ''), req);
    res.json({ user: target });
}));
router.put('/users/:id/status', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const target = await User_js_1.User.findById(req.params.id);
    if (!target) {
        res.status(404).json({ message: 'User not found.' });
        return;
    }
    if (!['admin', 'superadmin'].includes(req.user.role) && target.institution !== req.user.institution) {
        res.status(403).json({ message: 'Institution scope mismatch.' });
        return;
    }
    const active = Boolean(req.body.isActive);
    const reason = String(req.body.reason || '').trim();
    if (!active && !reason) {
        res.status(400).json({ message: 'A suspension reason is required.' });
        return;
    }
    const before = { isActive: target.isActive, disciplinaryStatus: target.disciplinaryStatus, tokenVersion: target.tokenVersion };
    target.isActive = active;
    target.disciplinaryStatus = active ? 'good_standing' : 'suspended';
    target.tokenVersion += 1;
    await target.save();
    await (0, audit_service_js_1.writeAudit)(req.user, active ? 'user.reactivate' : 'user.suspend', 'User', target._id, before, { isActive: target.isActive, disciplinaryStatus: target.disciplinaryStatus, tokenVersion: target.tokenVersion }, reason, req);
    res.json({ user: target });
}));
router.post('/users/:id/disciplinary', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const target = await User_js_1.User.findById(req.params.id);
    if (!target) {
        res.status(404).json({ message: 'User not found.' });
        return;
    }
    if (!['admin', 'superadmin'].includes(req.user.role) && target.institution !== req.user.institution) {
        res.status(403).json({ message: 'Institution scope mismatch.' });
        return;
    }
    if (!['good_standing', 'warning', 'probation', 'suspended'].includes(req.body.status) || !req.body.reason) {
        res.status(400).json({ message: 'Valid status and reason required.' });
        return;
    }
    const old = { disciplinaryStatus: target.disciplinaryStatus };
    target.disciplinaryStatus = req.body.status;
    if (target.disciplinaryStatus === 'suspended') {
        target.isActive = false;
        target.tokenVersion += 1;
    }
    await target.save();
    await (0, audit_service_js_1.writeAudit)(req.user, 'user.disciplinary.change', 'User', target._id, old, { disciplinaryStatus: target.disciplinaryStatus }, String(req.body.reason), req);
    res.json({ user: target });
}));
// Admin: list reports
router.get('/reports', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const allReports = await Report_js_1.Report.find().populate('reporter', 'name email institution role').sort({ createdAt: -1 });
    const reports = ['admin', 'superadmin'].includes(req.user.role) ? allReports : allReports.filter((r) => r.reporter?.institution === req.user.institution);
    res.json({ reports });
}));
// Admin: resolve report
router.put('/reports/:id', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const raw = req.body.status || req.body.action;
    const status = raw === 'dismissed' || raw === 'dismiss' ? 'dismissed' : 'resolved';
    const report = await Report_js_1.Report.findById(req.params.id);
    if (!report) {
        res.status(404).json({ message: 'Report not found.' });
        return;
    }
    const reporter = await User_js_1.User.findById(report.reporter);
    if (!['admin', 'superadmin'].includes(req.user.role) && reporter?.institution !== req.user.institution) {
        res.status(403).json({ message: 'Institution scope mismatch.' });
        return;
    }
    const previous = { status: report.status };
    report.status = status;
    await report.save();
    await (0, audit_service_js_1.writeAudit)(req.user, 'report.review', 'Report', report._id, previous, { status: report.status }, String(req.body.reason || ''), req);
    res.json({ message: `Report ${status}.`, report });
}));
router.get('/audit', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const filter = {};
    if (!['admin', 'superadmin'].includes(req.user.role))
        filter.institution = req.user.institution;
    const entries = await AuditLog_js_1.AuditLog.find(filter).sort({ sequence: -1 }).limit(Math.min(200, Number(req.query.limit) || 50)).lean();
    res.json({ entries });
}));
router.get('/audit/verify', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin']), (0, asyncHandler_js_1.asyncHandler)(async (_req, res) => { res.json(await (0, audit_service_js_1.verifyAuditChain)()); }));
router.put('/posts/:id/moderate', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const post = await Post_js_1.Post.findById(req.params.id);
    if (!post) {
        res.status(404).json({ message: 'Post not found.' });
        return;
    }
    if (!['admin', 'superadmin'].includes(req.user.role) && post.institution !== req.user.institution) {
        res.status(403).json({ message: 'Institution scope mismatch.' });
        return;
    }
    const previous = { visibility: post.visibility, isPinned: post.isPinned };
    if (req.body.visibility && !['public', 'institution-only'].includes(req.body.visibility)) {
        res.status(400).json({ message: 'Invalid visibility.' });
        return;
    }
    if (req.body.visibility)
        post.visibility = req.body.visibility;
    if (typeof req.body.isPinned === 'boolean')
        post.isPinned = req.body.isPinned;
    await post.save();
    await (0, audit_service_js_1.writeAudit)(req.user, 'post.moderate', 'Post', post._id, previous, { visibility: post.visibility, isPinned: post.isPinned }, String(req.body.reason || ''), req);
    res.json({ post });
}));
router.put('/communities/:id/moderate', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const community = await Community_js_1.Community.findById(req.params.id);
    if (!community) {
        res.status(404).json({ message: 'Community not found.' });
        return;
    }
    if (!['admin', 'superadmin'].includes(req.user.role) && community.institution !== req.user.institution) {
        res.status(403).json({ message: 'Institution scope mismatch.' });
        return;
    }
    const previous = { requiresApproval: community.requiresApproval };
    if (typeof req.body.requiresApproval === 'boolean')
        community.requiresApproval = req.body.requiresApproval;
    await community.save();
    await (0, audit_service_js_1.writeAudit)(req.user, 'community.moderate', 'Community', community._id, previous, { requiresApproval: community.requiresApproval }, String(req.body.reason || ''), req);
    res.json({ community });
}));
exports.default = router;
