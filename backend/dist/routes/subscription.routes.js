"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Subscription_js_1 = require("../models/Subscription.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
// GET all subscriptions for authenticated user
router.get('/my', auth_js_1.authenticate, async (req, res) => {
    try {
        const subscriptions = await Subscription_js_1.Subscription.find({ user: req.user._id })
            .sort({ createdAt: -1 });
        res.json({ subscriptions });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving subscriptions.', error: error.message });
    }
});
// CHECK if user is subscribed to a target
router.get('/check', auth_js_1.authenticate, async (req, res) => {
    try {
        const { targetType, targetId } = req.query;
        if (!targetType || !targetId) {
            res.status(400).json({ message: 'targetType and targetId are required query parameters.' });
            return;
        }
        const sub = await Subscription_js_1.Subscription.findOne({
            user: req.user._id,
            targetType: targetType,
            targetId: targetId.trim()
        });
        res.json({
            isSubscribed: !!sub,
            subscription: sub || null
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error checking subscription status.', error: error.message });
    }
});
// SUBSCRIBE to a topic / community / department / researcher / etc.
router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { targetType, targetId, targetName, preferences } = req.body;
        if (!targetType || !targetId) {
            res.status(400).json({ message: 'targetType and targetId are required.' });
            return;
        }
        const validTypes = [
            'topic',
            'community',
            'department',
            'institution',
            'research_subject',
            'researcher',
            'opportunity_category'
        ];
        if (!validTypes.includes(targetType)) {
            res.status(400).json({ message: `Invalid targetType: ${targetType}` });
            return;
        }
        const cleanTargetId = targetId.toString().trim();
        const cleanTargetName = (targetName || cleanTargetId).toString().trim();
        // Upsert subscription
        const subscription = await Subscription_js_1.Subscription.findOneAndUpdate({
            user: req.user._id,
            targetType,
            targetId: cleanTargetId
        }, {
            $set: {
                targetName: cleanTargetName,
                preferences: preferences || { inAppAlerts: true, emailAlerts: false }
            }
        }, { upsert: true, new: true });
        res.status(201).json({
            message: `Subscribed to ${cleanTargetName} successfully!`,
            subscription
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating subscription.', error: error.message });
    }
});
// TOGGLE SUBSCRIPTION
router.post('/toggle', auth_js_1.authenticate, async (req, res) => {
    try {
        const { targetType, targetId, targetName } = req.body;
        if (!targetType || !targetId) {
            res.status(400).json({ message: 'targetType and targetId are required.' });
            return;
        }
        const cleanTargetId = targetId.toString().trim();
        const cleanTargetName = (targetName || cleanTargetId).toString().trim();
        const existing = await Subscription_js_1.Subscription.findOne({
            user: req.user._id,
            targetType,
            targetId: cleanTargetId
        });
        if (existing) {
            await Subscription_js_1.Subscription.findByIdAndDelete(existing._id);
            res.json({
                message: `Unsubscribed from ${cleanTargetName}.`,
                isSubscribed: false,
                subscription: null
            });
        }
        else {
            const newSub = await Subscription_js_1.Subscription.create({
                user: req.user._id,
                targetType,
                targetId: cleanTargetId,
                targetName: cleanTargetName,
                preferences: { inAppAlerts: true, emailAlerts: false }
            });
            res.json({
                message: `Subscribed to ${cleanTargetName}!`,
                isSubscribed: true,
                subscription: newSub
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Error toggling subscription.', error: error.message });
    }
});
// UPDATE PREFERENCES
router.put('/:id/preferences', auth_js_1.authenticate, async (req, res) => {
    try {
        const { inAppAlerts, emailAlerts } = req.body;
        const sub = await Subscription_js_1.Subscription.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, {
            $set: {
                'preferences.inAppAlerts': inAppAlerts !== undefined ? inAppAlerts : true,
                'preferences.emailAlerts': emailAlerts !== undefined ? emailAlerts : false
            }
        }, { new: true });
        if (!sub) {
            res.status(404).json({ message: 'Subscription not found.' });
            return;
        }
        res.json({ message: 'Alert preferences updated.', subscription: sub });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating preferences.', error: error.message });
    }
});
// UNSUBSCRIBE by ID
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const sub = await Subscription_js_1.Subscription.findOneAndDelete({
            _id: req.params.id,
            user: req.user._id
        });
        if (!sub) {
            res.status(404).json({ message: 'Subscription not found.' });
            return;
        }
        res.json({ message: 'Unsubscribed successfully.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting subscription.', error: error.message });
    }
});
exports.default = router;
