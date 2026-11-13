"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Notification_js_1 = require("../models/Notification.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// GET notifications for current user with filtering and pagination
router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { type, unreadOnly, page = '1', limit = '50' } = req.query;
        const filter = { recipient: req.user._id };
        if (unreadOnly === 'true') {
            filter.isRead = false;
        }
        if (type && type !== 'all') {
            filter.type = type;
        }
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const skip = (pageNum - 1) * limitNum;
        const [notifications, total, unreadCount] = await Promise.all([
            Notification_js_1.Notification.find(filter)
                .populate('sender', 'name avatar institution role headline')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Notification_js_1.Notification.countDocuments(filter),
            Notification_js_1.Notification.countDocuments({
                recipient: req.user._id,
                isRead: false
            })
        ]);
        res.json({
            notifications,
            unreadCount,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving notifications.', error: error.message });
    }
});
// Mark all as read
router.put('/read-all', auth_js_1.authenticate, async (req, res) => {
    try {
        await Notification_js_1.Notification.updateMany({ recipient: req.user._id, isRead: false }, { $set: { isRead: true } });
        res.json({ message: 'All notifications marked as read.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating notifications.', error: error.message });
    }
});
// Mark single as read
router.put('/:id/read', auth_js_1.authenticate, async (req, res) => {
    try {
        const updated = await Notification_js_1.Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { $set: { isRead: true } }, { new: true });
        if (!updated) {
            res.status(404).json({ message: 'Notification not found.' });
            return;
        }
        res.json({ message: 'Notification marked as read.', notification: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating notification.', error: error.message });
    }
});
// Clear all read notifications
router.delete('/clear-read', auth_js_1.authenticate, async (req, res) => {
    try {
        await Notification_js_1.Notification.deleteMany({
            recipient: req.user._id,
            isRead: true
        });
        res.json({ message: 'Read alerts cleared successfully.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error clearing read notifications.', error: error.message });
    }
});
// Delete single notification
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const deleted = await Notification_js_1.Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user._id
        });
        if (!deleted) {
            res.status(404).json({ message: 'Notification not found.' });
            return;
        }
        res.json({ message: 'Notification deleted.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting notification.', error: error.message });
    }
});
exports.default = router;
