"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_js_1 = require("../models/User.js");
const Post_js_1 = require("../models/Post.js");
const Community_js_1 = require("../models/Community.js");
const Opportunity_js_1 = require("../models/Opportunity.js");
const Report_js_1 = require("../models/Report.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// Submit a report (any authenticated user can report objectionable content)
router.post('/reports', auth_js_1.authenticate, async (req, res) => {
    try {
        const { targetType, targetId, reason } = req.body;
        if (!targetType || !targetId || !reason) {
            res.status(400).json({ message: 'Target type, target ID, and reason are required.' });
            return;
        }
        const report = await Report_js_1.Report.create({
            reporter: req.user._id,
            targetType,
            targetId,
            reason
        });
        res.status(201).json({ message: 'Report submitted for review.', report });
    }
    catch (error) {
        res.status(500).json({ message: 'Error submitting report.', error: error.message });
    }
});
// Admin Dashboard Overview Statistics
router.get('/stats', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin']), async (_req, res) => {
    try {
        const [totalUsers, totalPosts, totalCommunities, totalOpportunities, totalReports] = await Promise.all([
            User_js_1.User.countDocuments(),
            Post_js_1.Post.countDocuments(),
            Community_js_1.Community.countDocuments(),
            Opportunity_js_1.Opportunity.countDocuments(),
            Report_js_1.Report.countDocuments({ status: 'pending' })
        ]);
        const rolesBreakdown = await User_js_1.User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        const institutionsBreakdown = await User_js_1.User.aggregate([
            { $group: { _id: '$institution', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        res.json({
            stats: {
                totalUsers,
                totalPosts,
                totalCommunities,
                totalOpportunities,
                pendingReports: totalReports,
                rolesBreakdown,
                institutionsBreakdown
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving statistics.', error: error.message });
    }
});
// Admin List Reports
router.get('/reports', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin']), async (_req, res) => {
    try {
        const reports = await Report_js_1.Report.find()
            .populate('reporter', 'name email institution role')
            .sort({ createdAt: -1 });
        res.json({ reports });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching reports.', error: error.message });
    }
});
// Admin Resolve / Update Report Status
router.put('/reports/:id', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin']), async (req, res) => {
    try {
        const rawStatus = req.body.status || req.body.action;
        let status = 'resolved';
        if (rawStatus === 'dismiss' || rawStatus === 'dismissed') {
            status = 'dismissed';
        }
        else if (rawStatus === 'resolve' || rawStatus === 'resolved') {
            status = 'resolved';
        }
        else if (rawStatus === 'pending') {
            status = 'pending';
        }
        const report = await Report_js_1.Report.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
        if (!report) {
            res.status(404).json({ message: 'Report not found.' });
            return;
        }
        res.json({ message: `Report marked as ${status}.`, report });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating report.', error: error.message });
    }
});
// Admin Verify / Unverify User Institution Status (Supports both /users/:id/verify and /verify-user/:id)
router.put(['/users/:id/verify', '/verify-user/:id'], auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin']), async (req, res) => {
    try {
        const { isVerified } = req.body;
        const user = await User_js_1.User.findByIdAndUpdate(req.params.id, { $set: { isVerified: Boolean(isVerified) } }, { new: true }).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }
        res.json({ message: `User verification updated.`, user });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating user verification.', error: error.message });
    }
});
exports.default = router;
