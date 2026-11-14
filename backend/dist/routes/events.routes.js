"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = require("mongoose");
const crypto_1 = require("crypto");
const auth_js_1 = require("../middleware/auth.js");
const Event_js_1 = require("../models/Event.js");
const EventRegistration_js_1 = require("../models/EventRegistration.js");
const AcademicCalendar_js_1 = require("../models/AcademicCalendar.js");
const UploadedFile_js_1 = require("../models/UploadedFile.js");
const User_js_1 = require("../models/User.js");
const delivery_service_js_1 = require("../services/delivery.service.js");
const errors_js_1 = require("../utils/errors.js");
const router = (0, express_1.Router)();
const idOk = (id) => mongoose_1.Types.ObjectId.isValid(id);
const activeStatuses = ['registered', 'waitlisted', 'attended'];
const isAuthority = (u) => ['dean', 'principal', 'admin', 'superadmin'].includes(u.role);
const isAdmin = (u) => ['admin', 'superadmin'].includes(u.role);
const hasAdvisor = (u) => (u.responsibilities || []).includes('club_advisor');
const sameInst = (u, e) => isAdmin(u) || u.institution === e.institution;
const canManage = (u, e) => sameInst(u, e) && (e.organizer.toString() === u._id.toString() || isAuthority(u) ||
    (u.role === 'faculty' && e.coordinators.some((c) => c.userId.toString() === u._id.toString())) ||
    (hasAdvisor(u) && u.role === 'faculty'));
const sendError = (res, err) => res.status(err.statusCode || 500).json({ message: err.message || 'Unexpected error' });
const parseDate = (v, name) => {
    const d = new Date(v);
    if (!v || Number.isNaN(d.getTime()))
        throw new errors_js_1.BadRequestError(`${name} must be a valid date`);
    return d;
};
function validateEventInput(body, partial = false) {
    if (!partial && (!body.title || !body.description || !body.startDate || !body.endDate))
        throw new errors_js_1.BadRequestError('title, description, startDate and endDate are required');
    if (body.startDate && body.endDate && parseDate(body.startDate, 'startDate') >= parseDate(body.endDate, 'endDate'))
        throw new errors_js_1.BadRequestError('endDate must be after startDate');
    if (body.registrationOpenDate && body.registrationCloseDate && parseDate(body.registrationOpenDate, 'registrationOpenDate') > parseDate(body.registrationCloseDate, 'registrationCloseDate'))
        throw new errors_js_1.BadRequestError('Registration opens after it closes');
    if (body.capacity !== undefined && (!Number.isInteger(body.capacity) || body.capacity < 0))
        throw new errors_js_1.BadRequestError('capacity must be a non-negative integer; 0 means unlimited');
    if (body.isTeamEvent && (body.minTeamSize < 2 || body.maxTeamSize < body.minTeamSize))
        throw new errors_js_1.BadRequestError('Team size range is invalid');
    if (body.mode === 'online' && body.onlineMeetingUrl && !/^https:\/\//i.test(body.onlineMeetingUrl))
        throw new errors_js_1.BadRequestError('Online meeting URL must use HTTPS');
}
const eventFields = ['title', 'description', 'mode', 'venue', 'onlineMeetingUrl', 'startDate', 'endDate', 'registrationOpenDate', 'registrationCloseDate', 'audience', 'eligibility', 'rules', 'capacity', 'isTeamEvent', 'minTeamSize', 'maxTeamSize', 'allowWaitlist', 'coordinators', 'sponsors', 'flyerUrl', 'files', 'schedule', 'category', 'tags', 'community'];
router.get('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const u = req.user;
        const isPrivileged = isAuthority(u) || u.role === 'faculty';
        // Faculty can see every event in their institution, including events awaiting review.
        // Students and alumni only see events that have been published.
        const defaultStatuses = isAdmin(u) || ['dean', 'principal'].includes(u.role)
            ? ['draft', 'pending_review', 'approved', 'rejected', 'published', 'ongoing', 'completed', 'cancelled']
            : u.role === 'faculty'
                ? ['draft', 'pending_review', 'approved', 'rejected', 'published', 'ongoing', 'completed', 'cancelled']
                : ['published', 'ongoing', 'completed'];
        const q = { institution: u.institution, status: { $in: defaultStatuses } };
        if (req.query.institution && isAdmin(u))
            q.institution = String(req.query.institution);
        // Allow explicit status filter for privileged roles
        if (req.query.status && isPrivileged)
            q.status = String(req.query.status);
        // Status filters are primarily for institution managers. Faculty can use them to
        // find any event in their institution, not just the events they organized.
        if (req.query.from)
            q.endDate = { $gte: parseDate(req.query.from, 'from') };
        if (req.query.to)
            q.startDate = { $lte: parseDate(req.query.to, 'to') };
        const events = await Event_js_1.Event.find(q).sort({ startDate: 1 }).limit(Math.min(Number(req.query.limit) || 50, 100));
        // For students: attach eligibility flag to each event
        if (u.role === 'student') {
            const enriched = events.map(e => {
                const el = e.eligibility;
                const eligible = (!el.targetRoles?.length || el.targetRoles.includes('student')) &&
                    (!el.targetDepartments?.length || el.targetDepartments.includes(u.department)) &&
                    (!el.targetBatches?.length || el.targetBatches.includes(u.batch || '')) &&
                    (!el.targetSemesters?.length || el.targetSemesters.includes(u.semester || 0)) &&
                    (!el.minCgpa || (u.cgpa || 0) >= el.minCgpa);
                return { ...e.toObject(), isEligible: eligible };
            });
            res.json({ events: enriched });
            return;
        }
        res.json({ events });
    }
    catch (e) {
        sendError(res, e);
    }
});
router.post('/', auth_js_1.authenticate, async (req, res) => {
    try {
        const u = req.user;
        if (!(u.role === 'faculty' || isAuthority(u) || hasAdvisor(u)))
            throw new errors_js_1.ForbiddenError('Only faculty, club advisors, Dean, Principal, and Admin may create events');
        validateEventInput(req.body);
        const d = { institution: u.role === 'superadmin' ? req.body.institution : u.institution, organizer: u._id, status: 'draft', ...Object.fromEntries(eventFields.filter(k => req.body[k] !== undefined).map(k => [k, req.body[k]])) };
        if (!d.institution)
            throw new errors_js_1.BadRequestError('institution is required for superadmin');
        if (d.files?.some((f) => !idOk(String(f.fileId))))
            throw new errors_js_1.BadRequestError('Event files must reference UploadedFile records');
        if (d.files?.length) {
            const fileIds = d.files.map((f) => f.fileId);
            const count = await UploadedFile_js_1.UploadedFile.countDocuments({ _id: { $in: fileIds }, uploaderId: u._id, associatedEntityType: 'event', isQuarantined: false, virusScanClean: true });
            if (count !== new Set(fileIds.map(String)).size)
                throw new errors_js_1.ForbiddenError('Files must be clean event uploads owned by the current user');
        }
        const event = await Event_js_1.Event.create(d);
        res.status(201).json({ event });
    }
    catch (e) {
        sendError(res, e);
    }
});
router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const u = req.user;
        const e = await Event_js_1.Event.findById(req.params.id);
        if (!e)
            throw new errors_js_1.NotFoundError('Event not found');
        // Non-admin students/alumni can only see published/ongoing/completed events
        const canSeeAll = isAuthority(u) || u.role === 'faculty' || canManage(u, e);
        if (!canSeeAll && !['published', 'ongoing', 'completed'].includes(e.status))
            throw new errors_js_1.ForbiddenError('Event is not available');
        if (!sameInst(u, e) && !canSeeAll)
            throw new errors_js_1.ForbiddenError('Event is not available');
        // Build role-aware response
        const eventObj = e.toObject();
        if (u.role === 'student') {
            // Eligibility check
            const el = e.eligibility;
            const eligible = (!el.targetRoles?.length || el.targetRoles.includes('student')) &&
                (!el.targetDepartments?.length || el.targetDepartments.includes(u.department)) &&
                (!el.targetBatches?.length || el.targetBatches.includes(u.batch || '')) &&
                (!el.targetSemesters?.length || el.targetSemesters.includes(u.semester || 0)) &&
                (!el.minCgpa || (u.cgpa || 0) >= el.minCgpa);
            const registration = await EventRegistration_js_1.EventRegistration.findOne({ eventId: e._id, userId: u._id, status: { $in: activeStatuses } });
            res.json({ event: { ...eventObj, isEligible: eligible, ineligibilityReasons: buildIneligibilityReasons(u, e) }, myRegistration: registration || null, canRegister: eligible && ['published', 'ongoing'].includes(e.status) });
            return;
        }
        if (u.role === 'faculty') {
            // Faculty see full event details + registration summary count, no personal registration
            const [registeredCount, waitlistedCount] = await Promise.all([
                EventRegistration_js_1.EventRegistration.countDocuments({ eventId: e._id, status: 'registered' }),
                EventRegistration_js_1.EventRegistration.countDocuments({ eventId: e._id, status: 'waitlisted' })
            ]);
            res.json({ event: eventObj, registrationSummary: { registered: registeredCount, waitlisted: waitlistedCount, capacity: e.capacity, allocatedSeats: e.allocatedSeats }, canRegister: false });
            return;
        }
        // Admin / dean / principal: full details
        const [registeredCount, waitlistedCount, attendedCount] = await Promise.all([
            EventRegistration_js_1.EventRegistration.countDocuments({ eventId: e._id, status: 'registered' }),
            EventRegistration_js_1.EventRegistration.countDocuments({ eventId: e._id, status: 'waitlisted' }),
            EventRegistration_js_1.EventRegistration.countDocuments({ eventId: e._id, status: 'attended' })
        ]);
        res.json({ event: eventObj, registrationSummary: { registered: registeredCount, waitlisted: waitlistedCount, attended: attendedCount, capacity: e.capacity, allocatedSeats: e.allocatedSeats }, canRegister: false });
    }
    catch (e) {
        sendError(res, e);
    }
});
function buildIneligibilityReasons(u, e) {
    const reasons = [];
    const el = e.eligibility;
    if (el.targetRoles?.length && !el.targetRoles.includes('student'))
        reasons.push('This event is not open to students');
    if (el.targetDepartments?.length && !el.targetDepartments.includes(u.department))
        reasons.push(`Your department (${u.department}) is not eligible`);
    if (el.targetBatches?.length && !el.targetBatches.includes(u.batch || ''))
        reasons.push(`Your batch (${u.batch}) is not eligible`);
    if (el.targetSemesters?.length && !el.targetSemesters.includes(u.semester || 0))
        reasons.push(`Your semester (${u.semester}) is not eligible`);
    if (el.minCgpa && (u.cgpa || 0) < el.minCgpa)
        reasons.push(`Minimum CGPA of ${el.minCgpa} required (yours: ${u.cgpa})`);
    return reasons;
}
router.put('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const e = await Event_js_1.Event.findById(req.params.id);
        if (!e)
            throw new errors_js_1.NotFoundError('Event not found');
        if (!canManage(req.user, e))
            throw new errors_js_1.ForbiddenError('Not authorized to edit this event');
        if (!['draft', 'rejected', 'pending_review', 'approved'].includes(e.status))
            throw new errors_js_1.ConflictError('Published events cannot be edited through this endpoint');
        validateEventInput(req.body, true);
        for (const k of eventFields)
            if (req.body[k] !== undefined)
                e[k] = req.body[k];
        if (req.body.files !== undefined) {
            const ids = req.body.files.map((f) => f.fileId);
            const count = await UploadedFile_js_1.UploadedFile.countDocuments({ _id: { $in: ids }, uploaderId: req.user._id, associatedEntityType: 'event', isQuarantined: false, virusScanClean: true });
            if (count !== new Set(ids.map(String)).size)
                throw new errors_js_1.ForbiddenError('Event files must be clean event uploads owned by the current user');
        }
        await e.save();
        res.json({ event: e });
    }
    catch (err) {
        sendError(res, err);
    }
});
router.post('/:id/submit', auth_js_1.authenticate, async (req, res) => {
    try {
        const e = await Event_js_1.Event.findById(req.params.id);
        if (!e)
            throw new errors_js_1.NotFoundError('Event not found');
        if (!canManage(req.user, e))
            throw new errors_js_1.ForbiddenError('Not authorized to submit this event');
        if (!e.flyerUrl && !e.files.some(f => f.fileType === 'flyer'))
            throw new errors_js_1.BadRequestError('A mandatory event flyer is required');
        if (!['draft', 'rejected'].includes(e.status))
            throw new errors_js_1.ConflictError('Event cannot be submitted in its current status');
        e.status = 'pending_review';
        e.rejectionReason = '';
        await e.save();
        res.json({ event: e });
    }
    catch (e) {
        sendError(res, e);
    }
});
router.post('/:id/review', auth_js_1.authenticate, async (req, res) => {
    try {
        const e = await Event_js_1.Event.findById(req.params.id);
        if (!e)
            throw new errors_js_1.NotFoundError('Event not found');
        if (!isAuthority(req.user) || !sameInst(req.user, e))
            throw new errors_js_1.ForbiddenError('Institution authority is required');
        if (e.status !== 'pending_review')
            throw new errors_js_1.ConflictError('Event is not awaiting review');
        if (req.body.decision === 'approve') {
            e.status = 'approved';
            e.approvedBy = req.user._id;
            e.approvedAt = new Date();
        }
        else if (req.body.decision === 'reject' && String(req.body.reason || '').trim()) {
            e.status = 'rejected';
            e.rejectionReason = String(req.body.reason).trim();
        }
        else
            throw new errors_js_1.BadRequestError('decision must be approve or reject; rejection requires reason');
        await e.save();
        res.json({ event: e });
    }
    catch (e) {
        sendError(res, e);
    }
});
router.post('/:id/publish', auth_js_1.authenticate, async (req, res) => {
    try {
        const e = await Event_js_1.Event.findById(req.params.id);
        if (!e)
            throw new errors_js_1.NotFoundError('Event not found');
        if (!canManage(req.user, e))
            throw new errors_js_1.ForbiddenError('Not authorized to publish this event');
        if (e.status !== 'approved' && !isAuthority(req.user))
            throw new errors_js_1.ConflictError('Event must be approved before publication');
        if (!e.flyerUrl && !e.files.some(f => f.fileType === 'flyer'))
            throw new errors_js_1.BadRequestError('A mandatory event flyer is required');
        e.status = 'published';
        e.publishedAt = new Date();
        await e.save();
        await delivery_service_js_1.DeliveryService.deliverContentNotification({ senderId: req.user._id, type: 'announcement', entityId: e._id.toString(), institution: e.institution, visibility: 'institution-only', specificRecipients: (await User_js_1.User.find({ institution: e.institution, isActive: true }).select('_id')).map(x => x._id), message: `New event: ${e.title}` });
        res.json({ event: e });
    }
    catch (e) {
        sendError(res, e);
    }
});
router.post('/:id/cancel', auth_js_1.authenticate, async (req, res) => {
    try {
        const e = await Event_js_1.Event.findById(req.params.id);
        if (!e)
            throw new errors_js_1.NotFoundError('Event not found');
        if (!canManage(req.user, e))
            throw new errors_js_1.ForbiddenError('Not authorized to cancel this event');
        if (['completed', 'cancelled'].includes(e.status))
            throw new errors_js_1.ConflictError('Event cannot be cancelled in its current status');
        e.status = 'cancelled';
        e.cancelledBy = req.user._id;
        e.cancelledAt = new Date();
        e.cancellationReason = String(req.body.reason || '').trim();
        await e.save();
        const users = await EventRegistration_js_1.EventRegistration.find({ eventId: e._id, status: { $in: ['registered', 'attended'] } }).distinct('userId');
        await delivery_service_js_1.DeliveryService.deliverContentNotification({ senderId: req.user._id, specificRecipients: users, type: 'schedule_change', entityId: `${e._id}:cancelled:${e.cancelledAt.getTime()}`, message: `Event cancelled: ${e.title}. ${e.cancellationReason}` });
        res.json({ event: e });
    }
    catch (e) {
        sendError(res, e);
    }
});
// HOLPS: Hold (atomic seat reservation), Operate (create record), Log (idempotency key), Settle (compensate on failure).
router.post('/:id/register', auth_js_1.authenticate, async (req, res) => {
    try {
        const u = req.user;
        const id = req.params.id;
        if (!idOk(id))
            throw new errors_js_1.BadRequestError('Invalid event id');
        const key = String(req.get('Idempotency-Key') || req.body.idempotencyKey || '').trim();
        if (key.length < 8 || key.length > 128)
            throw new errors_js_1.BadRequestError('Idempotency-Key of 8 to 128 characters is required');
        const found = await Event_js_1.Event.findOne({ _id: id, 'idempotencyKeys.key': key }).select('+idempotencyKeys');
        if (found) {
            const saved = await EventRegistration_js_1.EventRegistration.findById(found.idempotencyKeys.find(x => x.key === key)?.registrationId);
            res.json({ registration: saved, idempotentReplay: true });
            return;
        }
        let result;
        {
            const e = await Event_js_1.Event.findById(id).select('+idempotencyKeys');
            if (!e)
                throw new errors_js_1.NotFoundError('Event not found');
            if (e.institution !== u.institution)
                throw new errors_js_1.ForbiddenError('Cross-institution registration is not permitted');
            // Only students can register for events
            if (u.role !== 'student')
                throw new errors_js_1.ForbiddenError('Only students can register for events');
            if (!['published', 'ongoing'].includes(e.status))
                throw new errors_js_1.ConflictError('Registration is not open for this event');
            // Eligibility enforcement
            const el = e.eligibility;
            if (el.targetRoles?.length && !el.targetRoles.includes('student'))
                throw new errors_js_1.ForbiddenError('This event is not open to students');
            if (el.targetDepartments?.length && !el.targetDepartments.includes(u.department))
                throw new errors_js_1.ForbiddenError(`Your department (${u.department}) is not eligible for this event`);
            if (el.targetBatches?.length && !el.targetBatches.includes(u.batch || ''))
                throw new errors_js_1.ForbiddenError(`Your batch is not eligible for this event`);
            if (el.targetSemesters?.length && !el.targetSemesters.includes(u.semester || 0))
                throw new errors_js_1.ForbiddenError(`Your semester is not eligible for this event`);
            if (el.minCgpa && (u.cgpa || 0) < el.minCgpa)
                throw new errors_js_1.ForbiddenError(`Minimum CGPA of ${el.minCgpa} required to register`);
            const now = new Date();
            if (e.registrationOpenDate && now < e.registrationOpenDate || e.registrationCloseDate && now > e.registrationCloseDate)
                throw new errors_js_1.ConflictError('Registration period is closed');
            const existing = await EventRegistration_js_1.EventRegistration.findOne({ eventId: e._id, userId: u._id, status: { $in: activeStatuses } });
            if (existing) {
                res.status(200).json({ registration: existing, idempotentReplay: true });
                return;
            }
            const memberIds = Array.isArray(req.body.teamMembers) ? req.body.teamMembers.map((m) => String(m.userId)) : [];
            const seatCount = 1 + memberIds.length;
            if (new Set(memberIds).size !== memberIds.length || memberIds.includes(u._id.toString()))
                throw new errors_js_1.BadRequestError('Team members must be unique and cannot include the team leader');
            if (e.isTeamEvent) {
                if (seatCount < e.minTeamSize || seatCount > e.maxTeamSize)
                    throw new errors_js_1.BadRequestError(`Team size must be between ${e.minTeamSize} and ${e.maxTeamSize}`);
            }
            else if (memberIds.length)
                throw new errors_js_1.BadRequestError('This is an individual event');
            let status = 'registered';
            if (e.capacity > 0 && e.allocatedSeats + seatCount > e.capacity) {
                if (!e.allowWaitlist)
                    throw new errors_js_1.ConflictError('Event capacity is full');
                status = 'waitlisted';
            }
            if (status === 'registered') {
                const gate = { _id: e._id };
                if (e.capacity > 0)
                    gate.$expr = { $lte: [{ $add: ['$allocatedSeats', seatCount] }, '$capacity'] };
                const held = await Event_js_1.Event.findOneAndUpdate(gate, { $inc: { allocatedSeats: seatCount, registrationLockVersion: 1 } }, { new: true });
                if (!held) {
                    if (!e.allowWaitlist)
                        throw new errors_js_1.ConflictError('Event capacity is full');
                    status = 'waitlisted';
                }
            }
            const members = memberIds.length ? await User_js_1.User.find({ _id: { $in: memberIds }, institution: e.institution, isActive: true }).select('name email') : [];
            if (members.length !== memberIds.length)
                throw new errors_js_1.BadRequestError('Every team member must be an active member of this institution');
            const reg = new EventRegistration_js_1.EventRegistration({ eventId: e._id, userId: u._id, status, teamName: req.body.teamName || '', teamMembers: members.map(m => ({ userId: m._id, name: m.name, email: m.email })), seatsAllocated: seatCount, ticketCode: (0, crypto_1.randomBytes)(12).toString('hex') });
            try {
                await reg.save();
                if (status === 'waitlisted') {
                    reg.waitlistPosition = await EventRegistration_js_1.EventRegistration.countDocuments({ eventId: e._id, status: 'waitlisted' });
                    await reg.save();
                }
                e.idempotencyKeys.push({ key, userId: u._id, registrationId: reg._id, createdAt: now });
                if (e.idempotencyKeys.length > 1000)
                    e.idempotencyKeys.splice(0, e.idempotencyKeys.length - 1000);
                await e.save();
                result = reg;
            }
            catch (err) {
                if (status === 'registered')
                    await Event_js_1.Event.updateOne({ _id: e._id }, { $inc: { allocatedSeats: -seatCount } });
                throw err;
            }
        }
        if (result?.status === 'registered')
            await delivery_service_js_1.DeliveryService.deliverContentNotification({ senderId: u._id, specificRecipients: [u._id], type: 'event_registration', entityId: `${result._id}:confirmed`, message: `Registration confirmed for ${(await Event_js_1.Event.findById(id))?.title}` });
        res.status(201).json({ registration: result, idempotentReplay: false });
    }
    catch (e) {
        sendError(res, e);
    }
});
router.delete('/:id/register/:registrationId', auth_js_1.authenticate, async (req, res) => {
    try {
        let promoted = null;
        {
            const e = await Event_js_1.Event.findById(req.params.id);
            if (!e)
                throw new errors_js_1.NotFoundError('Event not found');
            const r = await EventRegistration_js_1.EventRegistration.findById(req.params.registrationId);
            if (!r || !r.eventId.equals(e._id))
                throw new errors_js_1.NotFoundError('Registration not found');
            if (r.userId.toString() !== req.user._id.toString() && !canManage(req.user, e))
                throw new errors_js_1.ForbiddenError('Cannot cancel this registration');
            if (r.status === 'cancelled') {
                promoted = null;
                return;
            }
            if (r.status === 'registered' || r.status === 'attended') {
                e.allocatedSeats = Math.max(0, e.allocatedSeats - r.seatsAllocated);
                const next = await EventRegistration_js_1.EventRegistration.findOne({ eventId: e._id, status: 'waitlisted' }).sort({ registeredAt: 1, _id: 1 });
                if (next && (e.capacity === 0 || e.allocatedSeats + next.seatsAllocated <= e.capacity)) {
                    next.status = 'registered';
                    next.waitlistPosition = undefined;
                    await next.save();
                    e.allocatedSeats += next.seatsAllocated;
                    promoted = next;
                    const rest = await EventRegistration_js_1.EventRegistration.find({ eventId: e._id, status: 'waitlisted' }).sort({ registeredAt: 1 });
                    for (let i = 0; i < rest.length; i++) {
                        rest[i].waitlistPosition = i + 1;
                        await rest[i].save();
                    }
                }
            }
            r.status = 'cancelled';
            r.cancelledAt = new Date();
            r.cancelledReason = String(req.body?.reason || '');
            await r.save();
            await e.save();
        }
        if (promoted)
            await delivery_service_js_1.DeliveryService.deliverContentNotification({ senderId: req.user._id, specificRecipients: [promoted.userId], type: 'event_registration', entityId: `${promoted._id}:promoted`, message: 'A seat opened and you have been promoted from the waitlist.' });
        res.json({ cancelled: true, promotedRegistration: promoted });
    }
    catch (e) {
        sendError(res, e);
    }
});
router.get('/:id/registrations', auth_js_1.authenticate, async (req, res) => {
    try {
        const e = await Event_js_1.Event.findById(req.params.id);
        if (!e)
            throw new errors_js_1.NotFoundError('Event not found');
        if (!canManage(req.user, e))
            throw new errors_js_1.ForbiddenError('Not authorized to view participants');
        const q = { eventId: e._id, status: { $in: activeStatuses } };
        if (req.query.status)
            q.status = String(req.query.status);
        const registrations = await EventRegistration_js_1.EventRegistration.find(q).populate('userId', 'name email department').sort({ registeredAt: 1 });
        res.json({ registrations });
    }
    catch (e) {
        sendError(res, e);
    }
});
router.post('/:id/attendance/:registrationId', auth_js_1.authenticate, async (req, res) => {
    try {
        const e = await Event_js_1.Event.findById(req.params.id);
        if (!e)
            throw new errors_js_1.NotFoundError('Event not found');
        if (!canManage(req.user, e))
            throw new errors_js_1.ForbiddenError('Not authorized to record attendance');
        const r = await EventRegistration_js_1.EventRegistration.findOne({ _id: req.params.registrationId, eventId: e._id });
        if (!r)
            throw new errors_js_1.NotFoundError('Registration not found');
        if (!['registered', 'attended'].includes(r.status))
            throw new errors_js_1.ConflictError('Only registered participants can be marked attended');
        r.status = req.body.attended === false ? 'registered' : 'attended';
        r.attendanceMarked = req.body.attended !== false;
        r.attendedAt = r.attendanceMarked ? new Date() : undefined;
        await r.save();
        res.json({ registration: r });
    }
    catch (e) {
        sendError(res, e);
    }
});
// Calendar create/update routes are institution scoped. Events are embedded for atomic publication.
router.get('/calendar/list', auth_js_1.authenticate, async (req, res) => {
    try {
        const inst = String(req.query.institution || req.user.institution);
        if (inst !== req.user.institution && !isAdmin(req.user))
            throw new errors_js_1.ForbiddenError('Cross-institution access denied');
        const q = { institution: inst, ...(req.query.academicYear ? { academicYear: String(req.query.academicYear) } : {}), ...(!isAuthority(req.user) ? { isPublished: true } : {}) };
        const calendars = await AcademicCalendar_js_1.AcademicCalendar.find(q).sort({ academicYear: 1, semesterType: 1 });
        const from = req.query.from ? parseDate(req.query.from, 'from') : null;
        const to = req.query.to ? parseDate(req.query.to, 'to') : null;
        res.json({ calendars: calendars.map(c => ({ ...c.toObject(), events: c.events.filter(x => (!from || x.endDate >= from) && (!to || x.startDate <= to)) })) });
    }
    catch (e) {
        sendError(res, e);
    }
});
router.post('/calendar', auth_js_1.authenticate, async (req, res) => {
    try {
        const u = req.user;
        const institution = u.role === 'superadmin' ? String(req.body.institution || '') : u.institution;
        if (!institution || !isAuthority(u))
            throw new errors_js_1.ForbiddenError('Dean, Principal, or Admin is required to manage calendars');
        const { academicYear, semesterType, collegeId } = req.body;
        if (!academicYear || !['odd', 'even', 'annual'].includes(semesterType))
            throw new errors_js_1.BadRequestError('academicYear and semesterType are required');
        const calendar = await AcademicCalendar_js_1.AcademicCalendar.findOneAndUpdate({ institution, academicYear, semesterType }, { $setOnInsert: { institution, academicYear, semesterType, collegeId, createdBy: u._id, events: [], isPublished: false } }, { upsert: true, new: true, runValidators: true });
        res.status(201).json({ calendar });
    }
    catch (e) {
        sendError(res, e);
    }
});
router.put('/calendar/:calendarId', auth_js_1.authenticate, async (req, res) => {
    try {
        const c = await AcademicCalendar_js_1.AcademicCalendar.findById(req.params.calendarId);
        if (!c)
            throw new errors_js_1.NotFoundError('Calendar not found');
        if (!isAuthority(req.user) || !sameInst(req.user, c))
            throw new errors_js_1.ForbiddenError('Institution authority is required');
        if (req.body.events !== undefined)
            c.events = req.body.events;
        const publishing = req.body.isPublished === true && !c.isPublished;
        if (req.body.isPublished !== undefined)
            c.isPublished = Boolean(req.body.isPublished);
        await c.save();
        if (publishing || req.body.events !== undefined) {
            const recipients = await User_js_1.User.find({ institution: c.institution, isActive: true }).select('_id');
            await delivery_service_js_1.DeliveryService.deliverContentNotification({ senderId: req.user._id, specificRecipients: recipients.map(x => x._id), type: 'calendar_change', entityId: `${c._id}:${c.updatedAt.getTime()}`, message: `Academic calendar updated for ${c.academicYear}` });
        }
        res.json({ calendar: c });
    }
    catch (e) {
        sendError(res, e);
    }
});
exports.default = router;
