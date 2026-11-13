"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Opportunity_js_1 = require("../models/Opportunity.js");
const Notification_js_1 = require("../models/Notification.js");
const delivery_service_js_1 = require("../services/delivery.service.js");
const auth_js_1 = require("../middleware/auth.js");
const Application_js_1 = require("../models/Application.js");
const User_js_1 = require("../models/User.js");
const router = (0, express_1.Router)();
const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};
// GET all opportunities with filtering
router.get('/', async (req, res) => {
    try {
        const { type, search, location } = req.query;
        const filter = { isActive: { $ne: false } };
        if (req.query.isPlacementDrive !== 'true')
            filter.isPlacementDrive = { $ne: true };
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
        if (req.query.institution)
            filter.institution = req.query.institution;
        if (req.query.branch)
            filter.eligibleBranches = { $in: [String(req.query.branch), 'all'] };
        if (req.query.batch)
            filter.eligibleBatches = { $in: [String(req.query.batch), 'all'] };
        if (req.query.isPlacementDrive === 'true')
            filter.isPlacementDrive = true;
        if (req.query.isPlacementDrive === 'false')
            filter.isPlacementDrive = { $ne: true };
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
        if (opportunity.isPlacementDrive) {
            res.status(404).json({ message: 'Placement opportunities are available through the authenticated placement search.' });
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
        const { title, organization, institution, type, location, description, requirements, skillsRequired, deadline, applyUrl, applicationQuestions, community, isPlacementDrive } = req.body;
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
        const placementDrive = Boolean(isPlacementDrive || type === 'Placement');
        const isPlacementAuthority = req.user.responsibilities?.includes('placement_coordinator') || ['dean', 'principal', 'admin', 'superadmin'].includes(req.user.role);
        if (placementDrive && !isPlacementAuthority) {
            res.status(403).json({ message: 'Placement Coordinator or institutional authority role is required.' });
            return;
        }
        if (placementDrive && (!Array.isArray(req.body.eligibleBranches) || !req.body.eligibleBranches.length || !Array.isArray(req.body.eligibleBatches) || !req.body.eligibleBatches.length)) {
            res.status(400).json({ message: 'Placement drives must explicitly configure eligible branches and batches.' });
            return;
        }
        const newOpp = await Opportunity_js_1.Opportunity.create({
            title: title.trim(),
            organization: organization.trim(),
            institution: institution || req.user.institution,
            type: type || 'Internship',
            location: location || 'Remote',
            description: description.trim(),
            requirements: reqsList,
            requiredSkills: Array.isArray(req.body.requiredSkills) ? req.body.requiredSkills : reqsList,
            isPlacementDrive: placementDrive,
            companyDetails: req.body.companyDetails || {},
            minimumCgpa: req.body.minimumCgpa,
            eligibleBranches: req.body.eligibleBranches || [],
            eligibleBatches: req.body.eligibleBatches || [],
            requiresResume: Boolean(req.body.requiresResume),
            package: req.body.package || '',
            applicationDeadline: req.body.applicationDeadline || deadline || undefined,
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
        if (opportunity.postedBy.toString() !== req.user._id.toString() && !(req.user.responsibilities?.includes('placement_coordinator') && req.user.institution === opportunity.institution) && !['dean', 'principal', 'admin', 'superadmin'].includes(req.user.role)) {
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
        const applicant = await User_js_1.User.findById(req.user._id);
        if (!opportunity.isActive || opportunity.applicationDeadline && new Date(opportunity.applicationDeadline) < new Date()) {
            res.status(409).json({ message: 'Applications are closed for this opportunity.' });
            return;
        }
        if (opportunity.isPlacementDrive) {
            if (applicant.role !== 'student' || applicant.institution !== opportunity.institution || applicant.isPlacementEligible !== true || applicant.cgpa === undefined || !applicant.batch || !applicant.department) {
                res.status(403).json({ message: 'Student placement eligibility is incomplete or unavailable.' });
                return;
            }
            if (opportunity.minimumCgpa !== undefined && applicant.cgpa < opportunity.minimumCgpa) {
                res.status(403).json({ message: 'CGPA is below the placement minimum.' });
                return;
            }
            if (opportunity.eligibleBranches.length && !opportunity.eligibleBranches.includes('all') && !opportunity.eligibleBranches.includes(applicant.department)) {
                res.status(403).json({ message: 'Student branch is not eligible.' });
                return;
            }
            if (opportunity.eligibleBatches.length && !opportunity.eligibleBatches.includes('all') && !opportunity.eligibleBatches.includes(applicant.batch)) {
                res.status(403).json({ message: 'Student batch is not eligible.' });
                return;
            }
            if (opportunity.eligibleBatches.length === 0) {
                res.status(403).json({ message: 'Placement drive has no eligible academic batches configured.' });
                return;
            }
            if (opportunity.eligibleBranches.length === 0) {
                res.status(403).json({ message: 'Placement drive has no eligible branches configured.' });
                return;
            }
            if (opportunity.requiresResume && !req.body.resumeLink) {
                res.status(400).json({ message: 'Resume is required for this placement drive.' });
                return;
            }
        }
        const idem = String(req.get('Idempotency-Key') || req.body.idempotencyKey || '').trim();
        if (idem) {
            const replay = await Application_js_1.Application.findOne({ applicant: req.user._id, opportunity: opportunity._id, idempotencyKey: idem });
            if (replay) {
                res.json({ message: 'Application already exists.', application: replay, idempotentReplay: true });
                return;
            }
        }
        let application;
        const prior = await Application_js_1.Application.findOne({ applicant: req.user._id, opportunity: opportunity._id });
        if (prior && prior.status !== 'withdrawn') {
            res.status(200).json({ message: 'Application already exists.', application: prior, idempotentReplay: true });
            return;
        }
        if (prior?.status === 'withdrawn') {
            prior.status = 'applied';
            prior.answers = req.body.answers || [];
            prior.note = note || '';
            prior.resumeLink = req.body.resumeLink || '';
            prior.history.push({ status: 'applied', changedBy: req.user._id, note: 'Reapplied', changedAt: new Date() });
            await prior.save();
            application = prior;
        }
        else {
            application = await Application_js_1.Application.create({ applicant: req.user._id, opportunity: opportunity._id, roleApplied: req.body.roleApplied || opportunity.title, answers: req.body.answers || [], status: 'applied', note: note || '', resumeLink: req.body.resumeLink || '', idempotencyKey: idem || undefined, history: [{ status: 'applied', changedBy: req.user._id }] });
        }
        // Trigger in-app notification to poster
        if (opportunity.postedBy.toString() !== req.user._id.toString()) {
            await Notification_js_1.Notification.create({
                recipient: opportunity.postedBy,
                sender: req.user._id,
                type: 'opportunity',
                entityId: application._id.toString(),
                message: `${req.user.name} (${req.user.institution}) registered candidacy for "${opportunity.title}": "${(note || '').substring(0, 50)}"`
            });
        }
        res.status(prior ? 200 : 201).json({ message: `Candidacy registered successfully with ${opportunity.organization}!`, opportunityId: opportunity._id, application, idempotentReplay: Boolean(prior) });
    }
    catch (error) {
        res.status(500).json({ message: 'Error submitting candidacy.', error: error.message });
    }
});
exports.default = router;
