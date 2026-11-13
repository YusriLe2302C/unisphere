"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Opportunity_js_1 = require("../models/Opportunity.js");
const Notification_js_1 = require("../models/Notification.js");
const delivery_service_js_1 = require("../services/delivery.service.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};
// GET all opportunities with filtering
router.get('/', async (req, res) => {
    try {
        const { type, search, location } = req.query;
        const filter = {};
        if (type && type !== 'All') {
            filter.type = type;
        }
        if (location && typeof location === 'string' && location.trim()) {
            filter.location = { $regex: escapeRegex(location.trim()), $options: 'i' };
        }
        if (search && typeof search === 'string' && search.trim()) {
            const escaped = escapeRegex(search.trim());
            filter.$or = [
                { title: { $regex: escaped, $options: 'i' } },
                { organization: { $regex: escaped, $options: 'i' } },
                { description: { $regex: escaped, $options: 'i' } }
            ];
        }
        const opportunities = await Opportunity_js_1.Opportunity.find(filter)
            .populate('postedBy', 'name avatar institution role')
            .sort({ createdAt: -1 });
        res.json({ opportunities });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving opportunities.', error: error.message });
    }
});
// GET single opportunity
router.get('/:id', async (req, res) => {
    try {
        const opportunity = await Opportunity_js_1.Opportunity.findById(req.params.id)
            .populate('postedBy', 'name avatar institution role email');
        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity not found.' });
            return;
        }
        res.json({ opportunity });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching opportunity.', error: error.message });
    }
});
// POST new opportunity
router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { title, organization, institution, type, location, description, requirements, skillsRequired, deadline, applyUrl, applicationQuestions, community } = req.body;
        if (!title || !organization || !description) {
            res.status(400).json({ message: 'Title, organization, and description are required.' });
            return;
        }
        const reqsList = Array.isArray(requirements)
            ? requirements
            : Array.isArray(skillsRequired)
                ? skillsRequired
                : [];
        const questionsList = Array.isArray(applicationQuestions)
            ? applicationQuestions.map((q) => q.trim()).filter(Boolean)
            : [];
        const newOpp = await Opportunity_js_1.Opportunity.create({
            title: title.trim(),
            organization: organization.trim(),
            institution: institution || req.user.institution,
            type: type || 'Internship',
            location: location || 'Remote',
            description: description.trim(),
            requirements: reqsList,
            applicationQuestions: questionsList,
            community: community || null,
            deadline: deadline || '',
            applyUrl: applyUrl || '',
            postedBy: req.user._id
        });
        const populated = await Opportunity_js_1.Opportunity.findById(newOpp._id)
            .populate('postedBy', 'name avatar institution role')
            .populate('community', 'name slug avatar');
        // Notify opportunity category subscribers
        await delivery_service_js_1.DeliveryService.deliverContentNotification({
            targets: [
                { targetType: 'opportunity_category', targetId: newOpp.type }
            ],
            senderId: req.user._id,
            type: 'opportunity',
            entityId: newOpp._id.toString(),
            message: `🎯 New ${newOpp.type}: "${newOpp.title}" at ${newOpp.organization}`,
            institution: newOpp.institution,
            communityId: newOpp.community || undefined
        });
        res.status(201).json({ message: 'Opportunity published successfully.', opportunity: populated });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating opportunity.', error: error.message });
    }
});
// DELETE opportunity
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const opportunity = await Opportunity_js_1.Opportunity.findById(req.params.id);
        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity not found.' });
            return;
        }
        if (opportunity.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            res.status(403).json({ message: 'Forbidden: You can only delete your own listings.' });
            return;
        }
        await Opportunity_js_1.Opportunity.findByIdAndDelete(opportunity._id);
        res.json({ message: 'Opportunity deleted.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting opportunity.', error: error.message });
    }
});
// APPLY to Opportunity / Register Candidacy
router.post('/:id/apply', auth_js_1.authenticate, async (req, res) => {
    try {
        const { note } = req.body;
        const opportunity = await Opportunity_js_1.Opportunity.findById(req.params.id);
        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity not found.' });
            return;
        }
        // Trigger in-app notification to poster
        if (opportunity.postedBy.toString() !== req.user._id.toString()) {
            await Notification_js_1.Notification.create({
                recipient: opportunity.postedBy,
                sender: req.user._id,
                type: 'opportunity',
                entityId: opportunity._id.toString(),
                message: `${req.user.name} (${req.user.institution}) registered candidacy for "${opportunity.title}": "${(note || '').substring(0, 50)}"`
            });
        }
        res.json({
            message: `Candidacy registered successfully with ${opportunity.organization}!`,
            opportunityId: opportunity._id
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error submitting candidacy.', error: error.message });
    }
});
exports.default = router;
