"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ResearchPaper_js_1 = require("../models/ResearchPaper.js");
const ResearchCollaboration_js_1 = require("../models/ResearchCollaboration.js");
const User_js_1 = require("../models/User.js");
const Community_js_1 = require("../models/Community.js");
const matching_service_js_1 = require("../services/matching.service.js");
const Notification_js_1 = require("../models/Notification.js");
const delivery_service_js_1 = require("../services/delivery.service.js");
const auth_js_1 = require("../middleware/auth.js");
const platform_config_js_1 = require("../config/platform.config.js");
const MentorshipBinding_js_1 = require("../models/MentorshipBinding.js");
const UploadedFile_js_1 = require("../models/UploadedFile.js");
const research_review_access_js_1 = require("../utils/research-review-access.js");
const router = (0, express_1.Router)();
const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};
// GET all research papers with filters, subject search, and institution visibility
router.get('/', auth_js_1.optionalAuthenticate, async (req, res) => {
    try {
        const { subject, publicationType, institution, search, page = 1, limit = 20 } = req.query;
        const baseScope = (0, platform_config_js_1.getInstitutionScope)(req.user?.institution);
        const filter = { ...baseScope, $or: [
                { lifecycleStatus: 'published' },
                { lifecycleStatus: { $exists: false } }
            ] };
        const authorFilter = req.query.authorId || req.query.author;
        if (typeof authorFilter === 'string' && authorFilter) {
            filter.$and = filter.$and || [];
            filter.$and.push({ $or: [{ primaryAuthorId: authorFilter }, { submittedBy: authorFilter }, { authorIds: authorFilter }] });
        }
        if (subject && subject !== 'All') {
            filter.subject = subject;
        }
        if (publicationType && publicationType !== 'All') {
            filter.publicationType = publicationType;
        }
        if (institution && typeof institution === 'string' && institution.trim()) {
            filter.institution = { $regex: escapeRegex(institution.trim()), $options: 'i' };
        }
        if (search && typeof search === 'string' && search.trim()) {
            const escaped = escapeRegex(search.trim());
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { title: { $regex: escaped, $options: 'i' } },
                    { abstract: { $regex: escaped, $options: 'i' } },
                    { doi: { $regex: escaped, $options: 'i' } },
                    { subject: { $regex: escaped, $options: 'i' } },
                    { 'authors.name': { $regex: escaped, $options: 'i' } },
                    { tags: { $in: [new RegExp(escaped, 'i')] } }
                ]
            });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const papers = await ResearchPaper_js_1.ResearchPaper.find(filter)
            .populate('submittedBy', 'name avatar institution role headline isVerified')
            .sort({ publicationDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await ResearchPaper_js_1.ResearchPaper.countDocuments(filter);
        res.json({
            papers,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving research publications.', error: error.message });
    }
});
// ==========================================
// RESEARCH COLLABORATION & MATCHING ENGINE
// ==========================================
// GET Match Recommendations for Collaborations (AI/Algorithmic Skill Matching)
router.get('/collaborations/matches', auth_js_1.authenticate, async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 12;
        const matches = await matching_service_js_1.MatchingService.matchCollaborationsForUser(req.user._id.toString(), limit);
        res.json({ matches });
    }
    catch (error) {
        res.status(500).json({ message: 'Error calculating collaboration matches.', error: error.message });
    }
});
// GET Compatible Scholars Matching (AI/Peer Researcher Matching)
router.get('/scholars/matches', auth_js_1.authenticate, async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 12;
        const matches = await matching_service_js_1.MatchingService.matchScholarsForUser(req.user._id.toString(), limit);
        res.json({ matches });
    }
    catch (error) {
        res.status(500).json({ message: 'Error calculating scholar compatibility matches.', error: error.message });
    }
});
// GET all research collaborations with filters
router.get('/collaborations', auth_js_1.optionalAuthenticate, async (req, res) => {
    try {
        const { subject, institution, status, skill, tags, supervisor, search, page = 1, limit = 20 } = req.query;
        const baseScope = (0, platform_config_js_1.getInstitutionScope)(req.user?.institution);
        const filter = { ...baseScope };
        if (subject && subject !== 'All') {
            filter.subject = subject;
        }
        if (status && status !== 'All') {
            filter.status = status;
        }
        if (institution && typeof institution === 'string' && institution.trim()) {
            filter.institution = { $regex: escapeRegex(institution.trim()), $options: 'i' };
        }
        if (skill && typeof skill === 'string' && skill.trim()) {
            filter.requiredSkills = { $in: [new RegExp(escapeRegex(skill.trim()), 'i')] };
        }
        if (tags && typeof tags === 'string' && tags.trim()) {
            filter.tags = { $in: [new RegExp(escapeRegex(tags.trim()), 'i')] };
        }
        if (supervisor && typeof supervisor === 'string' && supervisor.trim()) {
            const supVal = supervisor.trim();
            if (supVal.match(/^[0-9a-fA-F]{24}$/)) {
                filter.$or = filter.$or || [];
                filter.$or.push({ supervisor: supVal }, { leadResearcher: supVal });
            }
        }
        if (search && typeof search === 'string' && search.trim()) {
            const escaped = escapeRegex(search.trim());
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { title: { $regex: escaped, $options: 'i' } },
                    { description: { $regex: escaped, $options: 'i' } },
                    { subject: { $regex: escaped, $options: 'i' } },
                    { requiredSkills: { $in: [new RegExp(escaped, 'i')] } },
                    { tags: { $in: [new RegExp(escaped, 'i')] } }
                ]
            });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const collaborations = await ResearchCollaboration_js_1.ResearchCollaboration.find(filter)
            .populate('leadResearcher', 'name avatar institution role headline isVerified')
            .populate('supervisor', 'name avatar institution role headline isVerified')
            .populate('teamMembers.user', 'name avatar institution role headline isVerified')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await ResearchCollaboration_js_1.ResearchCollaboration.countDocuments(filter);
        res.json({
            collaborations,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving collaborations.', error: error.message });
    }
});
// GET Current Student's Submitted Collaboration Requests & Statuses
router.get('/collaborations/my-requests', auth_js_1.authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const collaborations = await ResearchCollaboration_js_1.ResearchCollaboration.find({
            'applications.applicant': userId
        })
            .populate('leadResearcher', 'name avatar institution role headline isVerified')
            .populate('supervisor', 'name avatar institution role headline isVerified')
            .sort({ updatedAt: -1 });
        const requests = [];
        for (const collab of collaborations) {
            const myApps = (collab.applications || []).filter((a) => a.applicant.toString() === userId.toString());
            for (const app of myApps) {
                requests.push({
                    _id: app._id,
                    collaborationId: collab._id,
                    projectTitle: collab.title,
                    subject: collab.subject,
                    institution: collab.institution,
                    projectStatus: collab.status,
                    leadResearcher: collab.leadResearcher,
                    supervisor: collab.supervisor,
                    roleSought: app.roleSought,
                    statement: app.statement,
                    relevantSkills: app.relevantSkills || [],
                    interests: app.interests || [],
                    portfolioUrl: app.portfolioUrl,
                    status: app.status,
                    reviewerNotes: app.reviewerNotes,
                    appliedAt: app.appliedAt,
                    reviewedAt: app.reviewedAt
                });
            }
        }
        requests.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
        res.json({ requests, total: requests.length });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving your collaboration requests.', error: error.message });
    }
});
// GET single collaboration proposal by ID
router.get('/collaborations/:id', auth_js_1.optionalAuthenticate, async (req, res) => {
    try {
        const collaboration = await ResearchCollaboration_js_1.ResearchCollaboration.findById(req.params.id)
            .populate('leadResearcher', 'name avatar institution role headline isVerified')
            .populate('supervisor', 'name avatar institution role headline isVerified')
            .populate('teamMembers.user', 'name avatar institution role headline isVerified')
            .populate('applications.applicant', 'name avatar institution role headline isVerified skills department graduationYear');
        if (!collaboration) {
            res.status(404).json({ message: 'Research collaboration project not found.' });
            return;
        }
        // Enforce private institutional restriction
        if (collaboration.visibility === 'institution-only') {
            if (!req.user || req.user.institution !== collaboration.institution) {
                res.status(403).json({
                    message: `Forbidden: This collaboration is restricted to members of ${collaboration.institution}.`
                });
                return;
            }
        }
        const collabObj = collaboration.toObject();
        const userId = req.user?._id?.toString();
        const isLead = userId && collaboration.leadResearcher._id.toString() === userId;
        const isSupervisor = userId && collaboration.supervisor?._id?.toString() === userId;
        const isAdmin = req.user?.role === 'admin';
        // Privacy protection: only the Lead Researcher, Supervisor, or Admin sees all applicant dossiers
        if (!isLead && !isSupervisor && !isAdmin) {
            collabObj.applications = (collabObj.applications || []).filter((app) => app.applicant?._id?.toString() === userId || app.applicant?.toString() === userId);
        }
        res.json({ collaboration: collabObj });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching collaboration.', error: error.message });
    }
});
// CREATE a new research collaboration proposal
router.post('/collaborations', auth_js_1.authenticate, async (req, res) => {
    try {
        const { title, description, subject, department, requiredSkills, openRoles, visibility, tags, externalLinks, supervisor } = req.body;
        if (!title || !description || !subject) {
            res.status(400).json({ message: 'Project title, description, and research subject are required.' });
            return;
        }
        const skillsArr = Array.isArray(requiredSkills)
            ? requiredSkills
            : typeof requiredSkills === 'string'
                ? requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
                : [];
        const tagsArr = Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
                ? tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean)
                : [];
        const newCollaboration = await ResearchCollaboration_js_1.ResearchCollaboration.create({
            title: title.trim(),
            description: description.trim(),
            leadResearcher: req.user._id,
            supervisor: supervisor || undefined,
            institution: req.user.institution,
            department: department || req.user.department || 'Research & Development',
            subject: subject.trim(),
            requiredSkills: skillsArr,
            openRoles: Array.isArray(openRoles) ? openRoles : [],
            teamMembers: [
                {
                    user: req.user._id,
                    role: 'Principal Investigator / Lead',
                    joinedAt: new Date()
                }
            ],
            applications: [],
            visibility: visibility || 'public',
            status: 'open',
            tags: tagsArr,
            externalLinks: Array.isArray(externalLinks) ? externalLinks : []
        });
        const populated = await ResearchCollaboration_js_1.ResearchCollaboration.findById(newCollaboration._id)
            .populate('leadResearcher', 'name avatar institution role headline isVerified')
            .populate('supervisor', 'name avatar institution role headline isVerified')
            .populate('teamMembers.user', 'name avatar institution role headline isVerified');
        // Notify subject subscribers about the new research initiative
        await delivery_service_js_1.DeliveryService.deliverContentNotification({
            targets: [
                { targetType: 'research_subject', targetId: newCollaboration.subject },
                { targetType: 'researcher', targetId: req.user._id.toString() }
            ],
            senderId: req.user._id,
            type: 'research_publication',
            entityId: newCollaboration._id.toString(),
            message: `🔬 New Research Collaboration Proposal in ${newCollaboration.subject}: "${newCollaboration.title}"`,
            visibility: newCollaboration.visibility,
            institution: newCollaboration.institution
        });
        res.status(201).json({
            message: 'Research collaboration proposal launched successfully.',
            collaboration: populated
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error initiating collaboration.', error: error.message });
    }
});
// UPDATE a research collaboration project
router.put('/collaborations/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const collaboration = await ResearchCollaboration_js_1.ResearchCollaboration.findById(req.params.id);
        if (!collaboration) {
            res.status(404).json({ message: 'Collaboration project not found.' });
            return;
        }
        const userId = req.user._id.toString();
        const isLead = collaboration.leadResearcher.toString() === userId;
        const isSupervisor = collaboration.supervisor && collaboration.supervisor.toString() === userId;
        const isAdmin = req.user.role === 'admin';
        if (!isLead && !isSupervisor && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: Only the Principal Investigator or Supervisor can update this collaboration.' });
            return;
        }
        const { title, description, subject, department, requiredSkills, openRoles, status, visibility, tags, externalLinks, supervisor } = req.body;
        if (title)
            collaboration.title = title.trim();
        if (description)
            collaboration.description = description.trim();
        if (subject)
            collaboration.subject = subject.trim();
        if (department)
            collaboration.department = department.trim();
        if (requiredSkills && Array.isArray(requiredSkills))
            collaboration.requiredSkills = requiredSkills;
        if (openRoles && Array.isArray(openRoles))
            collaboration.openRoles = openRoles;
        if (status)
            collaboration.status = status;
        if (visibility)
            collaboration.visibility = visibility;
        if (tags && Array.isArray(tags))
            collaboration.tags = tags;
        if (externalLinks && Array.isArray(externalLinks))
            collaboration.externalLinks = externalLinks;
        if (supervisor !== undefined)
            collaboration.supervisor = supervisor || undefined;
        await collaboration.save();
        const updated = await ResearchCollaboration_js_1.ResearchCollaboration.findById(collaboration._id)
            .populate('leadResearcher', 'name avatar institution role headline isVerified')
            .populate('supervisor', 'name avatar institution role headline isVerified')
            .populate('teamMembers.user', 'name avatar institution role headline isVerified');
        res.json({ message: 'Collaboration updated.', collaboration: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating collaboration.', error: error.message });
    }
});
// APPLY to join a research collaboration project
router.post('/collaborations/:id/apply', auth_js_1.authenticate, async (req, res) => {
    try {
        const { roleSought, statement, message, relevantSkills, interests, portfolioUrl } = req.body;
        const finalStatement = (statement || message || '').trim();
        if (!roleSought || !finalStatement) {
            res.status(400).json({ message: 'Role sought and a brief statement or message of interest are required.' });
            return;
        }
        const collaboration = await ResearchCollaboration_js_1.ResearchCollaboration.findById(req.params.id);
        if (!collaboration) {
            res.status(404).json({ message: 'Collaboration project not found.' });
            return;
        }
        if (collaboration.status !== 'open') {
            res.status(400).json({ message: 'This collaboration is currently not accepting new contributors.' });
            return;
        }
        const userId = req.user._id;
        // Check if user is already in team
        const isAlreadyMember = collaboration.teamMembers.some((m) => m.user.toString() === userId.toString());
        if (isAlreadyMember) {
            res.status(400).json({ message: 'You are already a confirmed member of this research team.' });
            return;
        }
        // Check if user already submitted an active application
        const existingActiveApp = collaboration.applications.find((a) => a.applicant.toString() === userId.toString() &&
            ['pending', 'applied', 'shortlisted', 'accepted'].includes(a.status));
        if (existingActiveApp) {
            res.status(400).json({
                message: `You already have an active request for this project (status: ${existingActiveApp.status}).`
            });
            return;
        }
        const skillsArr = Array.isArray(relevantSkills)
            ? relevantSkills
            : typeof relevantSkills === 'string'
                ? relevantSkills.split(',').map((s) => s.trim()).filter(Boolean)
                : [];
        const interestsArr = Array.isArray(interests)
            ? interests
            : typeof interests === 'string'
                ? interests.split(',').map((i) => i.trim()).filter(Boolean)
                : [];
        const newApp = {
            applicant: userId,
            roleSought: roleSought.trim(),
            statement: finalStatement,
            relevantSkills: skillsArr,
            interests: interestsArr,
            portfolioUrl: portfolioUrl ? portfolioUrl.trim() : '',
            status: 'pending',
            appliedAt: new Date()
        };
        collaboration.applications.push(newApp);
        await collaboration.save();
        const savedApplication = collaboration.applications[collaboration.applications.length - 1];
        // Notify Principal Investigator
        await Notification_js_1.Notification.create({
            recipient: collaboration.leadResearcher,
            sender: userId,
            type: 'collaboration_request',
            entityId: collaboration._id.toString(),
            message: `${req.user.name} (${req.user.institution}) submitted a collaboration request for "${collaboration.title}" as ${roleSought.trim()}.`
        });
        // Notify Supervisor if distinct from Lead
        if (collaboration.supervisor && collaboration.supervisor.toString() !== collaboration.leadResearcher.toString()) {
            await Notification_js_1.Notification.create({
                recipient: collaboration.supervisor,
                sender: userId,
                type: 'collaboration_request',
                entityId: collaboration._id.toString(),
                message: `${req.user.name} (${req.user.institution}) submitted a collaboration request for project supervised by you: "${collaboration.title}".`
            });
        }
        res.status(201).json({
            message: 'Collaboration application submitted successfully!',
            application: savedApplication
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error submitting application.', error: error.message });
    }
});
// REVIEW candidate application (Pending / Shortlisted / Accepted / Declined)
router.put('/collaborations/:id/applications/:appId', auth_js_1.authenticate, async (req, res) => {
    try {
        const { status, reviewerNotes } = req.body;
        const validStatuses = ['pending', 'shortlisted', 'accepted', 'declined', 'withdrawn'];
        if (!status || !validStatuses.includes(status)) {
            res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}.` });
            return;
        }
        const collaboration = await ResearchCollaboration_js_1.ResearchCollaboration.findById(req.params.id);
        if (!collaboration) {
            res.status(404).json({ message: 'Collaboration project not found.' });
            return;
        }
        const userId = req.user._id.toString();
        const isLead = collaboration.leadResearcher.toString() === userId;
        const isSupervisor = collaboration.supervisor && collaboration.supervisor.toString() === userId;
        const isAdmin = req.user.role === 'admin';
        if (!isLead && !isSupervisor && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: Only the Principal Investigator, Project Supervisor, or Admin can review candidate applications.' });
            return;
        }
        const app = collaboration.applications.id
            ? collaboration.applications.id(req.params.appId)
            : collaboration.applications.find((a) => a._id?.toString() === req.params.appId);
        if (!app) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }
        app.status = status;
        app.reviewedAt = new Date();
        if (reviewerNotes !== undefined) {
            app.reviewerNotes = reviewerNotes;
        }
        if (status === 'accepted') {
            // Add to teamMembers if not already present
            const alreadyInTeam = collaboration.teamMembers.some((m) => m.user.toString() === app.applicant.toString());
            if (!alreadyInTeam) {
                collaboration.teamMembers.push({
                    user: app.applicant,
                    role: app.roleSought || 'Research Collaborator',
                    joinedAt: new Date()
                });
                // Update filled count on matching open role
                const role = collaboration.openRoles.find((r) => r.roleTitle.toLowerCase() === app.roleSought.toLowerCase());
                if (role) {
                    role.filled = (role.filled || 0) + 1;
                }
            }
        }
        await collaboration.save();
        // Alert applicant about status update
        await Notification_js_1.Notification.create({
            recipient: app.applicant,
            sender: req.user._id,
            type: 'collaboration_status',
            entityId: collaboration._id.toString(),
            message: `Your collaboration request for "${collaboration.title}" as ${app.roleSought} has been updated to ${status.toUpperCase()}!`
        });
        res.json({
            message: `Application marked as ${status}.`,
            application: app
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error reviewing application.', error: error.message });
    }
});
// WITHDRAW collaboration application (Applicant action)
router.put('/collaborations/:id/applications/:appId/withdraw', auth_js_1.authenticate, async (req, res) => {
    try {
        const collaboration = await ResearchCollaboration_js_1.ResearchCollaboration.findById(req.params.id);
        if (!collaboration) {
            res.status(404).json({ message: 'Collaboration project not found.' });
            return;
        }
        const app = collaboration.applications.id
            ? collaboration.applications.id(req.params.appId)
            : collaboration.applications.find((a) => a._id?.toString() === req.params.appId);
        if (!app) {
            res.status(404).json({ message: 'Application request not found.' });
            return;
        }
        const userId = req.user._id.toString();
        if (app.applicant.toString() !== userId && req.user.role !== 'admin') {
            res.status(403).json({ message: 'Forbidden: You can only withdraw your own applications.' });
            return;
        }
        if (app.status === 'withdrawn') {
            res.status(400).json({ message: 'Application is already withdrawn.' });
            return;
        }
        app.status = 'withdrawn';
        app.reviewedAt = new Date();
        await collaboration.save();
        // Notify Lead Investigator
        await Notification_js_1.Notification.create({
            recipient: collaboration.leadResearcher,
            sender: req.user._id,
            type: 'collaboration_status',
            entityId: collaboration._id.toString(),
            message: `${req.user.name} withdrew their collaboration request for "${collaboration.title}".`
        });
        res.json({ message: 'Collaboration request withdrawn successfully.', application: app });
    }
    catch (error) {
        res.status(500).json({ message: 'Error withdrawing application.', error: error.message });
    }
});
// DELETE a collaboration project
router.delete('/collaborations/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const collaboration = await ResearchCollaboration_js_1.ResearchCollaboration.findById(req.params.id);
        if (!collaboration) {
            res.status(404).json({ message: 'Collaboration project not found.' });
            return;
        }
        const userId = req.user._id.toString();
        const isLead = collaboration.leadResearcher.toString() === userId;
        const isSupervisor = collaboration.supervisor && collaboration.supervisor.toString() === userId;
        const isAdmin = req.user.role === 'admin';
        if (!isLead && !isSupervisor && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: Only the Principal Investigator, Supervisor, or Admin can remove this collaboration.' });
            return;
        }
        await ResearchCollaboration_js_1.ResearchCollaboration.findByIdAndDelete(collaboration._id);
        res.json({ message: 'Collaboration project archived/removed.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting collaboration.', error: error.message });
    }
});
// ==========================================
// FACULTY RESEARCH PROFILES & RESEARCH GROUPS
// ==========================================
// GET Faculty Research Profiles
router.get('/faculty-profiles', auth_js_1.optionalAuthenticate, async (req, res) => {
    try {
        const { department, institution, search, page = 1, limit = 20 } = req.query;
        const filter = {
            role: { $in: ['faculty', 'researcher', 'professor', 'admin'] }
        };
        if (department && department !== 'All') {
            filter.department = { $regex: escapeRegex(department), $options: 'i' };
        }
        if (institution && typeof institution === 'string' && institution.trim()) {
            filter.institution = { $regex: escapeRegex(institution.trim()), $options: 'i' };
        }
        if (search && typeof search === 'string' && search.trim()) {
            const escaped = escapeRegex(search.trim());
            filter.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { headline: { $regex: escaped, $options: 'i' } },
                { bio: { $regex: escaped, $options: 'i' } },
                { skills: { $in: [new RegExp(escaped, 'i')] } },
                { interests: { $in: [new RegExp(escaped, 'i')] } }
            ];
        }
        const skip = (Number(page) - 1) * Number(limit);
        const facultyUsers = await User_js_1.User.find(filter)
            .select('name avatar institution department role headline bio skills interests isVerified createdAt')
            .sort({ isVerified: -1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const facultyIds = facultyUsers.map((f) => f._id);
        // Count published papers
        const papers = await ResearchPaper_js_1.ResearchPaper.aggregate([
            { $match: { submittedBy: { $in: facultyIds } } },
            { $group: { _id: '$submittedBy', count: { $sum: 1 } } }
        ]);
        const paperCountMap = new Map(papers.map((p) => [p._id.toString(), p.count]));
        // Count open collaborations led
        const collabs = await ResearchCollaboration_js_1.ResearchCollaboration.aggregate([
            { $match: { leadResearcher: { $in: facultyIds }, status: 'open' } },
            { $group: { _id: '$leadResearcher', count: { $sum: 1 } } }
        ]);
        const collabCountMap = new Map(collabs.map((c) => [c._id.toString(), c.count]));
        const facultyProfiles = facultyUsers.map((user) => ({
            _id: user._id,
            name: user.name,
            avatar: user.avatar,
            institution: user.institution,
            department: user.department,
            role: user.role,
            headline: user.headline,
            bio: user.bio,
            skills: user.skills || [],
            interests: user.interests || [],
            isVerified: user.isVerified,
            publicationsCount: paperCountMap.get(user._id.toString()) || 0,
            openProjectsCount: collabCountMap.get(user._id.toString()) || 0
        }));
        const total = await User_js_1.User.countDocuments(filter);
        res.json({
            faculty: facultyProfiles,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving faculty profiles.', error: error.message });
    }
});
// GET Research Groups & Labs
router.get('/research-groups', auth_js_1.optionalAuthenticate, async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const filter = {
            $or: [
                { category: { $in: ['Academic', 'Research', 'Tech & Innovation'] } },
                { name: { $regex: /research|lab|group|studio|center|institute/i } },
                { description: { $regex: /research|investigation|scholarly|laboratory/i } }
            ]
        };
        if (search && typeof search === 'string' && search.trim()) {
            const escaped = escapeRegex(search.trim());
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { name: { $regex: escaped, $options: 'i' } },
                    { description: { $regex: escaped, $options: 'i' } },
                    { category: { $regex: escaped, $options: 'i' } }
                ]
            });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const groups = await Community_js_1.Community.find(filter)
            .populate('creator', 'name avatar institution role headline isVerified')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await Community_js_1.Community.countDocuments(filter);
        const formattedGroups = groups.map((g) => ({
            _id: g._id,
            name: g.name,
            slug: g.slug,
            description: g.description,
            category: g.category,
            avatar: g.avatar,
            banner: g.banner,
            creator: g.creator,
            memberCount: (g.members || []).length,
            createdAt: g.createdAt
        }));
        res.json({
            groups: formattedGroups,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving research groups.', error: error.message });
    }
});
// GET single research paper by ID
router.get('/:id', auth_js_1.optionalAuthenticate, async (req, res) => {
    try {
        const paper = await ResearchPaper_js_1.ResearchPaper.findById(req.params.id)
            .populate('submittedBy', 'name avatar institution role headline isVerified');
        if (!paper) {
            res.status(404).json({ message: 'Research publication not found.' });
            return;
        }
        const requesterId = req.user?._id?.toString();
        const isOwner = Boolean(requesterId && paper.submittedBy.toString() === requesterId);
        const isReviewer = Boolean(requesterId && (paper.assignedProctorId?.toString() === requesterId ||
            paper.assignedProjectGuideId?.toString() === requesterId ||
            (paper.assignedProjectGuideIds || []).some(id => id.toString() === requesterId) ||
            paper.isStudentSubmission && paper.lifecycleStatus === 'pending_proctor' && (0, research_review_access_js_1.isInstitutionProctor)(req.user, paper)));
        if (paper.lifecycleStatus !== 'published' && !isOwner && !isReviewer && !['admin', 'dean', 'principal', 'superadmin'].includes(req.user?.role || '')) {
            res.status(404).json({ message: 'Research publication not found.' });
            return;
        }
        // Enforce private institutional restriction
        if (paper.visibility === 'institution-only') {
            if (!req.user || req.user.institution !== paper.institution) {
                res.status(403).json({ message: `Forbidden: This research publication is restricted to members of ${paper.institution || 'its host institution'}.` });
                return;
            }
        }
        res.json({ paper });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching publication.', error: error.message });
    }
});
// PUBLISH new research publication / artifact
router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { title, abstract, authors, publicationType, subject, doi, externalUrl, pdfUrl, datasetUrl, tags, visibility } = req.body;
        if (!title || !abstract || !subject) {
            res.status(400).json({ message: 'Title, abstract, and research subject are required.' });
            return;
        }
        // Default primary author to logged in user if not provided
        const authorList = Array.isArray(authors) && authors.length > 0
            ? authors
            : [{ name: req.user.name, user: req.user._id, institution: req.user.institution }];
        if (req.body.fileAttachmentId) {
            const file = await UploadedFile_js_1.UploadedFile.findOne({ _id: req.body.fileAttachmentId, uploaderId: req.user._id, associatedEntityType: 'research_paper', isQuarantined: false, virusScanClean: true });
            if (!file) {
                res.status(403).json({ message: 'PDF attachment must be a clean research_paper upload owned by the author.' });
                return;
            }
        }
        if (req.body.datasetFileId) {
            const file = await UploadedFile_js_1.UploadedFile.findOne({ _id: req.body.datasetFileId, uploaderId: req.user._id, associatedEntityType: 'research_dataset', isQuarantined: false, virusScanClean: true });
            if (!file) {
                res.status(403).json({ message: 'Dataset must be a clean research_dataset upload owned by the author.' });
                return;
            }
        }
        const isStudent = req.user.role === 'student';
        const proctor = isStudent ? await MentorshipBinding_js_1.MentorshipBinding.findOne({ student: req.user._id, assignmentType: 'proctor', status: 'active' }) : null;
        const guides = isStudent ? await MentorshipBinding_js_1.MentorshipBinding.find({ student: req.user._id, assignmentType: 'project_guide', status: 'active' }) : [];
        if (isStudent && (!proctor || !guides.length)) {
            res.status(409).json({ message: 'Active Proctor and Project Guide assignments are required before submission.' });
            return;
        }
        const newPaper = await ResearchPaper_js_1.ResearchPaper.create({
            title: title.trim(), abstract: abstract.trim(), authors: authorList,
            publicationType: publicationType || 'Preprint', subject: subject.trim(),
            ...(doi?.trim() ? { doi: doi.trim() } : {}), externalUrl: (externalUrl || '').trim(),
            pdfUrl: (pdfUrl || '').trim(), datasetUrl: (datasetUrl || '').trim(),
            tags: Array.isArray(tags) ? tags : [], institution: req.user.institution,
            visibility: isStudent ? 'institution-only' : (visibility || 'public'), submittedBy: req.user._id,
            primaryAuthorId: req.user._id,
            authorIds: [...new Set([req.user._id.toString(), ...authorList.map((a) => a.user?.toString()).filter(Boolean)])],
            isStudentSubmission: isStudent, lifecycleStatus: isStudent ? 'pending_proctor' : 'published',
            fileAttachmentId: req.body.fileAttachmentId,
            datasetFileId: req.body.datasetFileId,
            ...(isStudent ? { assignedProctorId: proctor.faculty, assignedProjectGuideId: guides[0].faculty,
                assignedProjectGuideIds: guides.map(g => g.faculty), revisionRound: 1,
                reviewHistory: [{ revisionRound: 1, submittedAt: new Date(), submittedBy: req.user._id }] } : {})
        });
        const studentFacultyRecipients = isStudent
            ? await User_js_1.User.find({ institution: newPaper.institution, role: 'faculty', isActive: true }).select('_id')
            : [];
        if (isStudent) {
            await delivery_service_js_1.DeliveryService.deliverContentNotification({
                specificRecipients: studentFacultyRecipients.map(faculty => faculty._id),
                senderId: req.user._id,
                type: 'system',
                entityId: newPaper._id.toString(),
                message: `Research submission requires review: ${newPaper.title}`,
                visibility: 'institution-only',
                institution: newPaper.institution
            });
        }
        const populated = await ResearchPaper_js_1.ResearchPaper.findById(newPaper._id)
            .populate('submittedBy', 'name avatar institution role headline isVerified');
        // Notify subject & author subscribers
        await delivery_service_js_1.DeliveryService.deliverContentNotification({
            targets: req.user.role === 'student' ? undefined : [
                { targetType: 'research_subject', targetId: newPaper.subject },
                { targetType: 'researcher', targetId: req.user._id.toString() }
            ],
            senderId: req.user._id,
            specificRecipients: isStudent ? studentFacultyRecipients.map(faculty => faculty._id) : undefined,
            type: req.user.role === 'student' ? 'system' : 'research_publication',
            entityId: newPaper._id.toString(),
            message: `🔬 New Publication in ${newPaper.subject}: "${newPaper.title}"`,
            visibility: newPaper.visibility,
            institution: newPaper.institution
        });
        res.status(201).json({
            message: isStudent ? 'Research submission sent for review.' : 'Research publication archived successfully.',
            paper: populated
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error publishing research artifact.', error: error.message });
    }
});
// UPDATE publication metadata
router.put('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const paper = await ResearchPaper_js_1.ResearchPaper.findById(req.params.id);
        if (!paper) {
            res.status(404).json({ message: 'Publication not found.' });
            return;
        }
        const userId = req.user._id.toString();
        const isOwner = paper.submittedBy.toString() === userId;
        const isAdmin = req.user.role === 'admin';
        if (paper.isStudentSubmission && paper.lifecycleStatus !== 'rejected') {
            res.status(409).json({ message: 'Student submissions may only be edited after rejection; use the resubmission workflow.' });
            return;
        }
        if (!isOwner && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: You do not have permission to modify this publication.' });
            return;
        }
        const { title, abstract, authors, publicationType, subject, doi, externalUrl, pdfUrl, datasetUrl, tags, visibility } = req.body;
        if (title)
            paper.title = title.trim();
        if (abstract)
            paper.abstract = abstract.trim();
        if (authors && Array.isArray(authors))
            paper.authors = authors;
        if (publicationType)
            paper.publicationType = publicationType;
        if (subject)
            paper.subject = subject.trim();
        if (doi !== undefined)
            paper.doi = doi.trim() || undefined;
        if (externalUrl !== undefined)
            paper.externalUrl = externalUrl.trim();
        if (pdfUrl !== undefined)
            paper.pdfUrl = pdfUrl.trim();
        if (datasetUrl !== undefined)
            paper.datasetUrl = datasetUrl.trim();
        if (tags && Array.isArray(tags))
            paper.tags = tags;
        if (visibility)
            paper.visibility = visibility;
        await paper.save();
        res.json({ message: 'Publication metadata updated.', paper });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating publication.', error: error.message });
    }
});
// DELETE publication
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const paper = await ResearchPaper_js_1.ResearchPaper.findById(req.params.id);
        if (!paper) {
            res.status(404).json({ message: 'Publication not found.' });
            return;
        }
        const userId = req.user._id.toString();
        const isOwner = paper.submittedBy.toString() === userId;
        const isAdmin = req.user.role === 'admin';
        if (paper.isStudentSubmission && !['rejected', 'archived'].includes(paper.lifecycleStatus || '')) {
            res.status(409).json({ message: 'Student submissions cannot be deleted during review or after publication.' });
            return;
        }
        if (!isOwner && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: Only the author or administrator can delete this publication.' });
            return;
        }
        await ResearchPaper_js_1.ResearchPaper.findByIdAndDelete(paper._id);
        res.json({ message: 'Research publication deleted.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting publication.', error: error.message });
    }
});
exports.default = router;
