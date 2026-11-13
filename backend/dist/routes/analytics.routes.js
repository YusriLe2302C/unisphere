"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_js_1 = require("../middleware/auth.js");
const Post_js_1 = require("../models/Post.js");
const Opportunity_js_1 = require("../models/Opportunity.js");
const Application_js_1 = require("../models/Application.js");
const ResearchCollaboration_js_1 = require("../models/ResearchCollaboration.js");
const ResearchPaper_js_1 = require("../models/ResearchPaper.js");
const Subscription_js_1 = require("../models/Subscription.js");
const router = express_1.default.Router();
/**
 * Helper to compute date filter boundaries from timeRange or explicit startDate/endDate
 */
function parseDateFilter(query) {
    const { timeRange, startDate, endDate } = query;
    const now = new Date();
    if (startDate || endDate) {
        return {
            start: startDate ? new Date(startDate) : undefined,
            end: endDate ? new Date(endDate) : undefined
        };
    }
    if (timeRange === '7d') {
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
    }
    else if (timeRange === '30d') {
        return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }
    else if (timeRange === '90d') {
        return { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
    }
    return {}; // 'all' or default
}
/**
 * GET /api/analytics/overview
 * Scoped, aggregated real metrics from stored collections:
 * - Event registrations, cancellations, capacity, and recorded attendance
 * - Club/opportunity recruitment applications broken down by status
 * - Research collaboration requests broken down by status
 * - Research publications, citations, downloads
 * - Subscriber counts
 * - Transparent disclosure of untracked metrics (e.g. content/page views)
 */
router.get('/overview', auth_js_1.authenticate, async (req, res) => {
    try {
        const user = req.user;
        const userId = user._id;
        const isAdmin = user.role === 'admin';
        const institution = user.institution;
        const { start, end } = parseDateFilter(req.query);
        // Common date match clause
        const dateMatch = {};
        if (start || end) {
            dateMatch.createdAt = {};
            if (start)
                dateMatch.createdAt.$gte = start;
            if (end)
                dateMatch.createdAt.$lte = end;
        }
        // ==========================================
        // 1. EVENT & ATTENDANCE METRICS
        // ==========================================
        // Scope: Admin sees institution-wide or platform events; organizers see events authored by themselves
        const eventQuery = {
            eventDetails: { $ne: null },
            ...dateMatch
        };
        if (!isAdmin) {
            eventQuery.author = userId;
        }
        else if (institution && req.query.scope === 'institution') {
            eventQuery.institution = institution;
        }
        // Fetch matching posts with event details (projection for performance)
        const matchingEvents = await Post_js_1.Post.find(eventQuery, {
            title: 1,
            category: 1,
            institution: 1,
            createdAt: 1,
            'eventDetails.capacity': 1,
            'eventDetails.isCancelled': 1,
            'eventDetails.cancellationReason': 1,
            'eventDetails.registeredAttendees': 1,
            'eventDetails.attendedAttendees': 1,
            'eventDetails.startDate': 1
        }).lean();
        let totalEvents = matchingEvents.length;
        let activeEvents = 0;
        let cancelledEvents = 0;
        let totalCapacity = 0;
        let totalRegistrations = 0;
        let totalRecordedAttendance = 0;
        const eventList = matchingEvents.map(e => {
            const details = e.eventDetails || {};
            const regCount = (details.registeredAttendees || []).length;
            const attCount = (details.attendedAttendees || []).length;
            const isCancelled = Boolean(details.isCancelled);
            if (isCancelled) {
                cancelledEvents++;
            }
            else {
                activeEvents++;
            }
            totalCapacity += Number(details.capacity) || 0;
            totalRegistrations += regCount;
            totalRecordedAttendance += attCount;
            return {
                id: e._id,
                title: e.title || 'Untitled Event',
                category: e.category,
                isCancelled,
                cancellationReason: details.cancellationReason || '',
                capacity: details.capacity || 0,
                registeredCount: regCount,
                recordedAttendanceCount: attCount,
                attendanceRate: regCount > 0 ? Number(((attCount / regCount) * 100).toFixed(1)) : 0,
                startDate: details.startDate,
                createdAt: e.createdAt
            };
        });
        const eventMetrics = {
            totalEvents,
            activeEvents,
            cancelledEvents,
            cancellationRate: totalEvents > 0 ? Number(((cancelledEvents / totalEvents) * 100).toFixed(1)) : 0,
            totalCapacity,
            totalRegistrations,
            totalRecordedAttendance,
            overallAttendanceRate: totalRegistrations > 0 ? Number(((totalRecordedAttendance / totalRegistrations) * 100).toFixed(1)) : 0,
            recentEvents: eventList.slice(0, 5)
        };
        // ==========================================
        // 2. RECRUITMENT & APPLICATION METRICS
        // ==========================================
        // Scope: Club organizers / faculty only see applications for opportunities they created.
        // Admins see opportunities in their institution (or system-wide).
        let opportunityIds = [];
        let opportunityQuery = {};
        if (!isAdmin) {
            opportunityQuery.postedBy = userId;
        }
        else if (institution && req.query.scope === 'institution') {
            opportunityQuery.institution = institution;
        }
        const ownedOpportunities = await Opportunity_js_1.Opportunity.find(opportunityQuery, { _id: 1, title: 1, type: 1 }).lean();
        opportunityIds = ownedOpportunities.map(o => o._id);
        const appMatch = {
            opportunity: { $in: opportunityIds },
            ...dateMatch
        };
        // Aggregate applications by status using MongoDB pipeline (avoids N+1)
        const appAggregation = opportunityIds.length > 0 ? await Application_js_1.Application.aggregate([
            { $match: appMatch },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]) : [];
        const recruitmentStatusCounts = {
            applied: 0,
            under_review: 0,
            shortlisted: 0,
            accepted: 0,
            rejected: 0,
            withdrawn: 0
        };
        let totalRecruitmentApplications = 0;
        appAggregation.forEach((item) => {
            if (item._id && recruitmentStatusCounts[item._id] !== undefined) {
                recruitmentStatusCounts[item._id] = item.count;
            }
            totalRecruitmentApplications += item.count;
        });
        const recruitmentMetrics = {
            totalOpportunities: ownedOpportunities.length,
            totalApplications: totalRecruitmentApplications,
            byStatus: recruitmentStatusCounts,
            acceptanceRate: totalRecruitmentApplications > 0
                ? Number(((recruitmentStatusCounts.accepted / totalRecruitmentApplications) * 100).toFixed(1))
                : 0
        };
        // ==========================================
        // 3. RESEARCH COLLABORATION REQUEST METRICS
        // ==========================================
        // Scope: Researchers / Supervisors only see requests for projects they lead or supervise.
        // Admins see projects in their institution (or system-wide).
        const collabQuery = {};
        if (!isAdmin) {
            collabQuery.$or = [{ leadResearcher: userId }, { supervisor: userId }];
        }
        else if (institution && req.query.scope === 'institution') {
            collabQuery.institution = institution;
        }
        const ownedCollaborations = await ResearchCollaboration_js_1.ResearchCollaboration.find(collabQuery, { title: 1, openRoles: 1, applications: 1, status: 1, createdAt: 1 }).lean();
        const collabStatusCounts = {
            pending: 0,
            applied: 0,
            shortlisted: 0,
            accepted: 0,
            declined: 0,
            withdrawn: 0
        };
        let totalCollabRequests = 0;
        let totalVacancies = 0;
        let totalFilled = 0;
        ownedCollaborations.forEach(collab => {
            // Roles engagement
            (collab.openRoles || []).forEach(r => {
                totalVacancies += Number(r.vacancies) || 0;
                totalFilled += Number(r.filled) || 0;
            });
            // Filter applications by date if filter active
            (collab.applications || []).forEach(app => {
                const appDate = app.appliedAt ? new Date(app.appliedAt) : new Date(collab.createdAt);
                if (start && appDate < start)
                    return;
                if (end && appDate > end)
                    return;
                const st = app.status || 'pending';
                if (collabStatusCounts[st] !== undefined) {
                    collabStatusCounts[st]++;
                }
                else {
                    collabStatusCounts.pending++;
                }
                totalCollabRequests++;
            });
        });
        const researchCollaborationMetrics = {
            totalProjects: ownedCollaborations.length,
            totalVacancies,
            totalFilledRoles: totalFilled,
            roleFillRate: totalVacancies > 0 ? Number(((totalFilled / totalVacancies) * 100).toFixed(1)) : 0,
            totalCollaborationRequests: totalCollabRequests,
            byStatus: collabStatusCounts,
            acceptanceRate: totalCollabRequests > 0
                ? Number(((collabStatusCounts.accepted / totalCollabRequests) * 100).toFixed(1))
                : 0
        };
        // ==========================================
        // 4. RESEARCH PUBLICATIONS & ENGAGEMENT
        // ==========================================
        const paperQuery = { ...dateMatch };
        if (!isAdmin) {
            paperQuery.submittedBy = userId;
        }
        else if (institution && req.query.scope === 'institution') {
            paperQuery.institution = institution;
        }
        const matchingPapers = await ResearchPaper_js_1.ResearchPaper.find(paperQuery, { title: 1, citations: 1, downloadCount: 1, publicationType: 1 }).lean();
        let totalCitations = 0;
        let totalDownloads = 0;
        matchingPapers.forEach(p => {
            totalCitations += Number(p.citations) || 0;
            totalDownloads += Number(p.downloadCount) || 0;
        });
        const publicationMetrics = {
            totalPublications: matchingPapers.length,
            recordedCitations: totalCitations,
            recordedDownloads: totalDownloads
        };
        // ==========================================
        // 5. SUBSCRIBER REACH & AUDIENCE METRICS
        // ==========================================
        // Subscriptions to researcher profile, or authored club/community topics
        let subscriberFilter = {};
        if (!isAdmin) {
            // Find targets related to this user
            const userTargets = [
                userId.toString(),
                user.name,
                user.department
            ].filter(Boolean);
            subscriberFilter = {
                $or: [
                    { targetType: 'researcher', targetId: userId.toString() },
                    { targetType: 'department', targetId: user.department }
                ]
            };
        }
        const subscriberAgg = await Subscription_js_1.Subscription.aggregate([
            { $match: subscriberFilter },
            {
                $group: {
                    _id: '$targetType',
                    count: { $sum: 1 }
                }
            }
        ]);
        let totalSubscribers = 0;
        const subscriberBreakdown = {};
        subscriberAgg.forEach((item) => {
            subscriberBreakdown[item._id] = item.count;
            totalSubscribers += item.count;
        });
        const subscriptionMetrics = {
            totalSubscribers,
            byTargetType: subscriberBreakdown
        };
        // ==========================================
        // 6. TRANSPARENT UNTRACKED METRICS DISCLOSURE
        // ==========================================
        // Documenting strictly what is NOT tracked per prompt instructions:
        // "Document any metrics that cannot yet be calculated because the required data is not being collected."
        const untrackedMetricsDisclosure = [
            {
                metric: 'Content & Page Views',
                reason: 'Individual dispatch and publication view/impression tracking is not recorded in the database schema. No synthetic or estimated values are displayed.',
                status: 'Data collection not enabled'
            },
            {
                metric: 'Post Share / Forward Counts',
                reason: 'External link clickthroughs and outbound dispatches are not logged at the user interaction level.',
                status: 'Data collection not enabled'
            }
        ];
        res.json({
            scope: isAdmin ? (req.query.scope === 'institution' ? `institution:${institution}` : 'platform-wide') : `organizer:${user.name}`,
            userRole: user.role,
            appliedFilter: {
                timeRange: req.query.timeRange || (start ? 'custom' : 'all'),
                startDate: start,
                endDate: end
            },
            metrics: {
                events: eventMetrics,
                recruitment: recruitmentMetrics,
                collaboration: researchCollaborationMetrics,
                publications: publicationMetrics,
                subscribers: subscriptionMetrics
            },
            untrackedMetrics: untrackedMetricsDisclosure,
            generatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error retrieving analytics overview.', error: error.message });
    }
});
exports.default = router;
