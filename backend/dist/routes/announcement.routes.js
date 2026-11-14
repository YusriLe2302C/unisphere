"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Announcement_js_1 = require("../models/Announcement.js");
const User_js_1 = require("../models/User.js");
const delivery_service_js_1 = require("../services/delivery.service.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
/**
 * Permission matrix for publishing announcements:
 * - admin/superadmin: platform-wide, any institution
 * - principal/dean: own institution only, any targeting
 * - faculty: own institution only, limited to academic categories
 * - club_advisor (responsibility): own institution, community/club scope
 * - student/alumni: not permitted
 */
const ANNOUNCEMENT_ALLOWED_ROLES = ['admin', 'superadmin', 'principal', 'dean', 'faculty'];
const AUDIENCE_ROLES = {
    students: ['student'],
    faculty: ['faculty', 'dean', 'principal'],
    alumni: ['alumni']
};
function announcementRecipientQuery(announcement) {
    const query = { isActive: true };
    if (announcement.institution !== '*')
        query.institution = announcement.institution;
    const clauses = [];
    const audienceRoles = AUDIENCE_ROLES[announcement.targetAudience];
    if (audienceRoles)
        clauses.push({ role: { $in: audienceRoles } });
    if (announcement.targetRoles?.length) {
        clauses.push({ role: { $in: announcement.targetRoles } });
    }
    if (announcement.targetDepartments?.length) {
        clauses.push({ department: { $in: announcement.targetDepartments } });
    }
    if (announcement.targetAcademicYears?.length) {
        clauses.push({ batch: { $in: announcement.targetAcademicYears } });
    }
    if (announcement.targetSemesters?.length) {
        clauses.push({ semester: { $in: announcement.targetSemesters } });
    }
    if (announcement.targetSections?.length) {
        clauses.push({ section: { $in: announcement.targetSections } });
    }
    if (clauses.length)
        query.$and = clauses;
    return query;
}
async function notifyAnnouncementRecipients(announcement, senderId, updated = false) {
    const recipients = await User_js_1.User.find(announcementRecipientQuery(announcement)).select('_id');
    if (!recipients.length)
        return;
    await delivery_service_js_1.DeliveryService.deliverContentNotification({
        specificRecipients: recipients.map((recipient) => recipient._id),
        senderId,
        type: 'announcement',
        entityId: updated
            ? `${announcement._id}:updated:${announcement.updatedAt.getTime()}`
            : announcement._id.toString(),
        message: updated
            ? `📢 Updated announcement: ${announcement.title}`
            : `📢 [${announcement.institution}] ${announcement.title}`
    });
}
function canPublishAnnouncement(user, targetInstitution) {
    const role = user.role;
    const hasAdvisorResponsibility = (user.responsibilities || []).includes('club_advisor');
    if (role === 'admin' || role === 'superadmin')
        return { allowed: true };
    if (role === 'principal' || role === 'dean') {
        if (user.institution !== targetInstitution) {
            return { allowed: false, reason: 'You can only publish announcements within your own institution.' };
        }
        return { allowed: true };
    }
    if (role === 'faculty' || hasAdvisorResponsibility) {
        if (user.institution !== targetInstitution) {
            return { allowed: false, reason: 'You can only publish announcements within your own institution.' };
        }
        return { allowed: true };
    }
    return { allowed: false, reason: 'Your role is not permitted to publish announcements.' };
}
// Build visibility filter for a user querying announcements
function buildVisibilityFilter(user) {
    const filter = {};
    if (user.role === 'admin' || user.role === 'superadmin') {
        return filter; // See all
    }
    // Platform-wide admin announcements use "*"; institution-targeted notices
    // remain scoped to the viewer's institution.
    filter.$or = [{ institution: user.institution }, { institution: '*' }];
    // Audience filter: must match 'all' or user's role-mapped audience
    const audienceMap = {
        student: 'students',
        faculty: 'faculty',
        alumni: 'alumni',
        dean: 'faculty',
        principal: 'faculty'
    };
    const userAudience = audienceMap[user.role] || 'all';
    // Keep the audience clause separate from targeting clauses. Authors must be
    // able to retrieve their own posts even when they targeted a different audience.
    filter.$and = [
        { $or: [{ author: user._id }, { targetAudience: 'all' }, { targetAudience: userAudience }] },
        { $or: [{ author: user._id }, { targetRoles: { $size: 0 } }, { targetRoles: user.role }] },
        { $or: [{ author: user._id }, { targetDepartments: { $size: 0 } }, { targetDepartments: user.department }] },
        { $or: [{ author: user._id }, { targetAcademicYears: { $size: 0 } }, { targetAcademicYears: user.batch }] },
        { $or: [{ author: user._id }, { targetSemesters: { $size: 0 } }, { targetSemesters: user.semester }] },
        { $or: [{ author: user._id }, { targetSections: { $size: 0 } }, { targetSections: user.section }] }
    ];
    return filter;
}
// Check if a user matches the targeting criteria of an announcement
function userMatchesTargeting(user, ann) {
    if (user.role === 'admin' || user.role === 'superadmin')
        return true;
    // Authors can always see the posts they created, including posts aimed at
    // another role, department, batch, semester, or section.
    if (ann.author?._id?.toString() === user._id.toString() || ann.author?.toString() === user._id.toString())
        return true;
    if (ann.institution !== '*' && ann.institution !== user.institution)
        return false;
    const audienceMap = {
        student: 'students', faculty: 'faculty', alumni: 'alumni',
        dean: 'faculty', principal: 'faculty'
    };
    const userAudience = audienceMap[user.role] || 'all';
    if (ann.targetAudience !== 'all' && ann.targetAudience !== userAudience)
        return false;
    if (ann.targetRoles?.length > 0 && !ann.targetRoles.includes(user.role))
        return false;
    if (ann.targetDepartments?.length > 0 && !ann.targetDepartments.includes(user.department))
        return false;
    if (ann.targetAcademicYears?.length > 0 && !ann.targetAcademicYears.includes(user.batch))
        return false;
    if (ann.targetSemesters?.length > 0 && !ann.targetSemesters.includes(user.semester))
        return false;
    if (ann.targetSections?.length > 0 && !ann.targetSections.includes(user.section))
        return false;
    return true;
}
// GET /announcements — list with targeting filter applied
router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 20, category, institution } = req.query;
        const user = req.user;
        const filter = buildVisibilityFilter(user);
        if (category)
            filter.category = category;
        // Admin can filter by institution explicitly
        if (institution && (user.role === 'admin' || user.role === 'superadmin')) {
            filter.institution = institution;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [announcements, total] = await Promise.all([
            Announcement_js_1.Announcement.find(filter)
                .populate('author', 'name avatar institution role department')
                .sort({ isPinned: -1, createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Announcement_js_1.Announcement.countDocuments(filter)
        ]);
        res.json({
            announcements,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving announcements.', error: err.message });
    }
});
// GET /announcements/:id
router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const ann = await Announcement_js_1.Announcement.findById(req.params.id)
            .populate('author', 'name avatar institution role department');
        if (!ann) {
            res.status(404).json({ message: 'Announcement not found.' });
            return;
        }
        if (!userMatchesTargeting(req.user, ann)) {
            res.status(403).json({ message: 'Forbidden: This announcement is not targeted at you.' });
            return;
        }
        res.json({ announcement: ann });
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching announcement.', error: err.message });
    }
});
// POST /announcements — create
router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const { title, content, institution, targetAudience, targetRoles, targetDepartments, targetAcademicYears, targetSemesters, targetSections, category, isPinned, expiresAt } = req.body;
        if (!title || !content) {
            res.status(400).json({ message: 'Title and content are required.' });
            return;
        }
        const isPlatformAdmin = user.role === 'admin' || user.role === 'superadmin';
        const targetInst = institution || (isPlatformAdmin ? '*' : user.institution);
        const perm = canPublishAnnouncement(user, targetInst);
        if (!perm.allowed) {
            res.status(403).json({ message: perm.reason });
            return;
        }
        const ann = await Announcement_js_1.Announcement.create({
            title: title.trim(),
            content: content.trim(),
            author: user._id,
            institution: targetInst,
            targetAudience: targetAudience || 'all',
            targetRoles: targetRoles || [],
            targetDepartments: targetDepartments || [],
            targetAcademicYears: targetAcademicYears || [],
            targetSemesters: targetSemesters || [],
            targetSections: targetSections || [],
            category: category || 'General',
            isPinned: isPinned || false,
            expiresAt: expiresAt || undefined
        });
        await notifyAnnouncementRecipients(ann, user._id);
        res.status(201).json({ message: 'Announcement published.', announcement: ann });
    }
    catch (err) {
        res.status(500).json({ message: 'Error creating announcement.', error: err.message });
    }
});
// PUT /announcements/:id — edit
router.put('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const ann = await Announcement_js_1.Announcement.findById(req.params.id);
        if (!ann) {
            res.status(404).json({ message: 'Announcement not found.' });
            return;
        }
        const user = req.user;
        const isAuthor = ann.author.toString() === user._id.toString();
        const isAdmin = user.role === 'admin' || user.role === 'superadmin';
        if (!isAuthor && !isAdmin) {
            res.status(403).json({ message: 'Forbidden: You can only edit your own announcements.' });
            return;
        }
        const fields = ['title', 'content', 'targetAudience', 'targetRoles', 'targetDepartments',
            'targetAcademicYears', 'targetSemesters', 'targetSections', 'category', 'isPinned', 'expiresAt'];
        fields.forEach(f => { if (req.body[f] !== undefined)
            ann[f] = req.body[f]; });
        await ann.save();
        await notifyAnnouncementRecipients(ann, user._id, true);
        res.json({ message: 'Announcement updated.', announcement: ann });
    }
    catch (err) {
        res.status(500).json({ message: 'Error updating announcement.', error: err.message });
    }
});
// DELETE /announcements/:id
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const ann = await Announcement_js_1.Announcement.findById(req.params.id);
        if (!ann) {
            res.status(404).json({ message: 'Announcement not found.' });
            return;
        }
        const user = req.user;
        const isAuthor = ann.author.toString() === user._id.toString();
        const isAdmin = user.role === 'admin' || user.role === 'superadmin';
        const isInstitutionAuthority = (user.role === 'principal' || user.role === 'dean') && user.institution === ann.institution;
        if (!isAuthor && !isAdmin && !isInstitutionAuthority) {
            res.status(403).json({ message: 'Forbidden: Insufficient permissions to delete this announcement.' });
            return;
        }
        await Announcement_js_1.Announcement.findByIdAndDelete(ann._id);
        res.json({ message: 'Announcement deleted.' });
    }
    catch (err) {
        res.status(500).json({ message: 'Error deleting announcement.', error: err.message });
    }
});
exports.default = router;
