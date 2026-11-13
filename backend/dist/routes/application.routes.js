"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Application_js_1 = require("../models/Application.js");
const Opportunity_js_1 = require("../models/Opportunity.js");
const Community_js_1 = require("../models/Community.js");
const auth_js_1 = require("../middleware/auth.js");
const User_js_1 = require("../models/User.js");
const delivery_service_js_1 = require("../services/delivery.service.js");
const UploadedFile_js_1 = require("../models/UploadedFile.js");
const router = (0, express_1.Router)();
// SUBMIT APPLICATION (Opportunity or Club Recruitment)
router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const opportunityId = req.body.opportunityId || req.body.opportunity;
        const answers = req.body.answers;
        const note = req.body.note || req.body.notes || '';
        const resumeLink = req.body.resumeLink || req.body.resumeUrl || '';
        const resumeFileId = req.body.resumeFileId;
        const roleApplied = req.body.roleApplied;
        if (!opportunityId) {
            res.status(400).json({ message: 'Opportunity ID is required.' });
            return;
        }
        const opportunity = await Opportunity_js_1.Opportunity.findById(opportunityId);
        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity or club opening not found.' });
            return;
        }
        const student = await User_js_1.User.findById(req.user._id);
        let resumeFile;
        if (resumeFileId) {
            resumeFile = await UploadedFile_js_1.UploadedFile.findOne({ _id: resumeFileId, uploaderId: req.user._id, associatedEntityType: 'placement_document', accessPolicy: 'private' });
            if (!resumeFile) {
                res.status(400).json({ message: 'Resume file must be a private placement document uploaded by the applicant.' });
                return;
            }
        }
        if (!opportunity.isActive || opportunity.applicationDeadline && new Date(opportunity.applicationDeadline) < new Date()) {
            res.status(409).json({ message: 'Applications are closed.' });
            return;
        }
        if (opportunity.isPlacementDrive) {
            if (student.role !== 'student' || student.institution !== opportunity.institution || student.isPlacementEligible !== true || student.cgpa === undefined || !student.batch || !student.department) {
                res.status(403).json({ message: 'Placement eligibility is incomplete or unavailable.' });
                return;
            }
            if (opportunity.minimumCgpa !== undefined && student.cgpa < opportunity.minimumCgpa) {
                res.status(403).json({ message: 'CGPA is below the placement minimum.' });
                return;
            }
            if (opportunity.eligibleBranches.length && !opportunity.eligibleBranches.includes('all') && !opportunity.eligibleBranches.includes(student.department)) {
                res.status(403).json({ message: 'Branch is not eligible.' });
                return;
            }
            if (opportunity.eligibleBatches.length && !opportunity.eligibleBatches.includes('all') && !opportunity.eligibleBatches.includes(student.batch)) {
                res.status(403).json({ message: 'Batch is not eligible.' });
                return;
            }
            if (opportunity.eligibleBatches.length === 0 || opportunity.eligibleBranches.length === 0) {
                res.status(403).json({ message: 'Placement eligibility configuration is incomplete.' });
                return;
            }
            if (opportunity.requiresResume && !resumeLink && !resumeFileId) {
                res.status(400).json({ message: 'Resume is required.' });
                return;
            }
        }
        // Check if user already submitted an application
        const idempotencyKey = String(req.get('Idempotency-Key') || req.body.idempotencyKey || '').trim();
        if (idempotencyKey) {
            const replay = await Application_js_1.Application.findOne({ applicant: req.user._id, opportunity: opportunity._id, idempotencyKey });
            if (replay) {
                res.json({ message: 'Application already exists.', application: replay, idempotentReplay: true });
                return;
            }
        }
        const existing = await Application_js_1.Application.findOne({
            applicant: req.user._id,
            opportunity: opportunity._id
        });
        if (existing) {
            if (existing.status === 'withdrawn') {
                // Allow re-application if previously withdrawn
                existing.status = 'applied';
                existing.answers = answers || [];
                existing.note = note || '';
                existing.resumeLink = resumeLink || '';
                existing.resumeFileId = resumeFile?._id;
                existing.roleApplied = roleApplied || opportunity.title;
                existing.history.push({ status: 'applied', changedBy: req.user._id, note: 'Reapplied', changedAt: new Date() });
                await existing.save();
                res.json({ message: 'Application reactivated successfully!', application: existing });
                return;
            }
            res.status(400).json({ message: 'You have already submitted an application for this position.' });
            return;
        }
        const application = await Application_js_1.Application.create({
            applicant: req.user._id,
            opportunity: opportunity._id,
            roleApplied: roleApplied || opportunity.title,
            answers: answers || [],
            status: 'applied',
            note: note || '',
            resumeLink: resumeLink || '',
            resumeFileId: resumeFile?._id,
            idempotencyKey: idempotencyKey || undefined,
            history: [{ status: 'applied', changedBy: req.user._id }]
        });
        if (resumeFile) {
            resumeFile.associatedEntityType = 'application';
            resumeFile.associatedEntityId = application._id;
            resumeFile.allowedUserIds = [student._id, opportunity.postedBy];
            await resumeFile.save();
        }
        // Notify the organizer / poster
        if (opportunity.postedBy.toString() !== req.user._id.toString()) {
            await delivery_service_js_1.DeliveryService.deliverContentNotification({ specificRecipients: [opportunity.postedBy], senderId: req.user._id, type: 'opportunity', entityId: application._id.toString(), message: `${req.user.name} submitted an application for "${opportunity.title}".` });
        }
        res.status(201).json({
            message: 'Application submitted successfully!',
            application
        });
    }
    catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'You have already submitted an application for this opening.' });
            return;
        }
        res.status(500).json({ message: 'Error submitting application.', error: error.message });
    }
});
// GET MY SUBMISSIONS (Current student's applications)
router.get('/my', auth_js_1.authenticate, async (req, res) => {
    try {
        const applications = await Application_js_1.Application.find({ applicant: req.user._id })
            .populate({
            path: 'opportunity',
            select: 'title organization type location deadline postedBy community institution',
            populate: {
                path: 'postedBy',
                select: 'name avatar institution role'
            }
        })
            .sort({ createdAt: -1 });
        res.json({ applications });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving your applications.', error: error.message });
    }
});
// GET CANDIDATES FOR AN OPENING (Poster or Club Organizer Review Drawer)
router.get('/target/:targetId', auth_js_1.authenticate, async (req, res) => {
    try {
        const opportunity = await Opportunity_js_1.Opportunity.findById(req.params.targetId);
        if (!opportunity) {
            res.status(404).json({ message: 'Opening not found.' });
            return;
        }
        const userId = req.user._id.toString();
        const isPoster = opportunity.postedBy.toString() === userId;
        const isAdmin = req.user.role === 'admin';
        const isPlacementManager = Boolean(opportunity.isPlacementDrive && (req.user.responsibilities?.includes('placement_coordinator') || ['dean', 'principal', 'admin', 'superadmin'].includes(req.user.role)) && (req.user.institution === opportunity.institution || ['admin', 'superadmin'].includes(req.user.role)));
        // If club-associated, check if user is community moderator/creator
        let isClubMod = false;
        if (opportunity.community) {
            const community = await Community_js_1.Community.findById(opportunity.community);
            if (community) {
                isClubMod = community.creator.toString() === userId || community.moderators.some(id => id.toString() === userId);
            }
        }
        if (opportunity.isPlacementDrive ? !isPlacementManager : !isPoster && !isClubMod && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: You do not have permission to view candidate dossiers for this opening.' });
            return;
        }
        const applications = await Application_js_1.Application.find({ opportunity: opportunity._id })
            .populate('applicant', 'name email avatar institution department graduationYear skills headline isVerified')
            .sort({ createdAt: -1 });
        res.json({
            opening: opportunity,
            applications
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching candidates.', error: error.message });
    }
});
// UPDATE APPLICATION STATUS (Review Pipeline: shortlisted, accepted, rejected)
router.put('/:id/status', auth_js_1.authenticate, async (req, res) => {
    try {
        const { status, reviewerNotes } = req.body;
        const validStatuses = ['applied', 'under_review', 'shortlisted', 'accepted', 'rejected'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
            return;
        }
        const application = await Application_js_1.Application.findById(req.params.id)
            .populate('opportunity');
        if (!application) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }
        const opportunity = application.opportunity;
        const userId = req.user._id.toString();
        const isPoster = opportunity.postedBy.toString() === userId;
        const isAdmin = req.user.role === 'admin';
        let isClubMod = false;
        if (opportunity.community) {
            const community = await Community_js_1.Community.findById(opportunity.community);
            if (community) {
                isClubMod = community.creator.toString() === userId || community.moderators.some(id => id.toString() === userId);
            }
        }
        if (!isPoster && !isClubMod && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: You do not have permission to review this candidate.' });
            return;
        }
        if (opportunity.isPlacementDrive && !(req.user.responsibilities?.includes('placement_coordinator') || ['dean', 'principal', 'admin', 'superadmin'].includes(req.user.role)) && !isPoster) {
            res.status(403).json({ message: 'Placement Coordinator or institutional authority is required.' });
            return;
        }
        application.status = status;
        application.history.push({ status, changedBy: req.user._id, note: reviewerNotes || '', changedAt: new Date() });
        if (status === 'accepted')
            application.selectionStatus = 'selected';
        if (status === 'rejected')
            application.selectionStatus = 'not_selected';
        if (reviewerNotes !== undefined)
            application.reviewerNotes = reviewerNotes;
        await application.save();
        // Trigger notification to candidate
        await delivery_service_js_1.DeliveryService.deliverContentNotification({ specificRecipients: [application.applicant], senderId: req.user._id, type: 'opportunity', entityId: `${application._id}:${application.updatedAt.getTime()}`, message: `Your application status for "${opportunity.title}" was updated to "${status.toUpperCase()}".` });
        res.json({
            message: `Application status updated to ${status}.`,
            application
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating application status.', error: error.message });
    }
});
// WITHDRAW APPLICATION (Applicant only)
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const application = await Application_js_1.Application.findById(req.params.id);
        if (!application) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }
        if (application.applicant.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Forbidden: You can only withdraw your own applications.' });
            return;
        }
        application.status = 'withdrawn';
        application.history.push({ status: 'withdrawn', changedBy: req.user._id, changedAt: new Date() });
        await application.save();
        res.json({ message: 'Application withdrawn successfully.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error withdrawing application.', error: error.message });
    }
});
// EXPORT CANDIDATE DATA (Restricted to Authorized Poster / Club Organizer / Admin, Minimum Information Necessary)
router.get('/target/:targetId/export', auth_js_1.authenticate, async (req, res) => {
    try {
        const opportunity = await Opportunity_js_1.Opportunity.findById(req.params.targetId);
        if (!opportunity) {
            res.status(404).json({ message: 'Opportunity not found.' });
            return;
        }
        const userId = req.user._id.toString();
        const isPoster = opportunity.postedBy.toString() === userId;
        const isAdmin = req.user.role === 'admin';
        let isClubMod = false;
        if (opportunity.community) {
            const community = await Community_js_1.Community.findById(opportunity.community);
            if (community) {
                isClubMod = community.creator.toString() === userId || community.moderators.some(id => id.toString() === userId);
            }
        }
        if (!isPoster && !isClubMod && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: You do not have permission to export candidate data.' });
            return;
        }
        const applications = await Application_js_1.Application.find({ opportunity: opportunity._id })
            .populate('applicant', 'name email institution department graduationYear skills')
            .sort({ createdAt: -1 });
        // Sanitize export payload: minimum necessary information, no sensitive tokens/credentials
        const sanitizedExport = applications.map(app => {
            const applicant = app.applicant || {};
            return {
                applicationId: app._id,
                candidateName: applicant.name || 'Anonymous',
                candidateEmail: applicant.email || '',
                institution: applicant.institution || '',
                department: applicant.department || '',
                roleApplied: app.roleApplied,
                status: app.status,
                appliedDate: app.createdAt,
                reviewerNotes: app.reviewerNotes || ''
            };
        });
        res.json({
            opportunityTitle: opportunity.title,
            exportedAt: new Date().toISOString(),
            recordCount: sanitizedExport.length,
            records: sanitizedExport
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error exporting candidate data.', error: error.message });
    }
});
router.get('/:id/history', auth_js_1.authenticate, async (req, res) => {
    try {
        const application = await Application_js_1.Application.findById(req.params.id).populate('opportunity');
        if (!application) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }
        const opportunity = application.opportunity;
        const owner = application.applicant.toString() === req.user._id.toString();
        const manager = opportunity?.isPlacementDrive && (req.user.responsibilities?.includes('placement_coordinator') || ['dean', 'principal', 'admin', 'superadmin'].includes(req.user.role)) && (req.user.institution === opportunity.institution || ['admin', 'superadmin'].includes(req.user.role));
        if (!owner && !manager) {
            res.status(403).json({ message: 'Not authorized to view application history.' });
            return;
        }
        res.json({ history: application.history || [], interviewRounds: application.interviewRounds || [], selectionStatus: application.selectionStatus, offerStatus: application.offerStatus });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving application history.', error: error.message });
    }
});
exports.default = router;
