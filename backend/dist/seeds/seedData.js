"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unisphere comprehensive development seed
 *
 * Place this file beside the `models/` directory (so `./models/index.js` resolves).
 * Run with: npx tsx seeddata.ts
 * Required env: MONGODB_URI
 * Optional env: SEED_PASSWORD (default: Seed@12345)
 *
 * WARNING: This script inserts stable fixture IDs and is not safe to rerun into
 * a populated database. Run ONLY against a fresh development/test database.
 */
// import {dotenv} from 'dotenv';
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const node_crypto_1 = require("node:crypto");
const index_1 = require("../models/index");
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/uniglobe_db';
if (!MONGO_URI)
    throw new Error('MONGODB_URI is required');
const INSTITUTION = 'RNS Institute of Technology';
const COLLEGE_ID = 'RNSIT-BLR';
const DEPARTMENT = 'Computer Science';
const PASSWORD = process.env.SEED_PASSWORD || 'Seed@12345';
// Stable IDs make the resulting test graph easy to inspect and reuse.
const oid = (n) => new mongoose_1.Types.ObjectId(n.toString(16).padStart(24, '0'));
const ID = {
    admin: oid(1), superadmin: oid(11), principal: oid(2), dean: oid(3), faculty1: oid(4), faculty2: oid(5),
    student1: oid(6), student2: oid(7), student3: oid(8), alumni: oid(9), faculty3: oid(10),
    community1: oid(101), community2: oid(102), opportunity1: oid(201), opportunity2: oid(202),
    opportunity3: oid(203), event1: oid(301), event2: oid(302), event3: oid(303), event4: oid(304), event5: oid(305), event6: oid(306), event7: oid(307), event8: oid(308),
    paper1: oid(401), paper2: oid(402), paper3: oid(403), paper4: oid(404), paper5: oid(405), paper6: oid(406), paper7: oid(407), paper8: oid(408), collaboration1: oid(501), collaboration2: oid(502), collaboration3: oid(503),
    conversation1: oid(601), conversation2: oid(602), file1: oid(701), file2: oid(702), file3: oid(703), file4: oid(704),
};
const now = new Date();
const days = (n) => new Date(now.getTime() + n * 86400000);
const minutes = (h, m = 0) => h * 60 + m;
// async function clearCollections() {
//   // Delete dependent records first. This is a development-only full reset.
//   const models = [
//     Message, Conversation, EventRegistration, Event, Application, ResearchReview,
//     ResearchPaper, ResearchCollaboration, MentorshipBinding, MentorshipRequest,
//     CareerQuestion, Timetable, TimetableWriteLock, AcademicCalendar, Announcement,
//     Notification, NotificationPreference, Subscription, Report, Post, Community,
//     Opportunity, UploadedFile, Connection, AuditLog, AuditHead, User,
//   ];
//   for (const model of models) await model.deleteMany({});
// }
async function seed() {
    await mongoose_1.default.connect(MONGO_URI);
    console.log('Connected:', mongoose_1.default.connection.name);
    // await clearCollections();
    const password = await bcryptjs_1.default.hash(PASSWORD, 10);
    const users = await index_1.User.insertMany([
        { _id: ID.superadmin, name: 'Arjun Rao', email: 'superadmin@rnsit.test', password, role: 'superadmin', institution: INSTITUTION, collegeId: COLLEGE_ID, institutionDomain: 'rnsit.test', isVerified: true, department: 'Administration', responsibilities: [], isActive: true },
        { _id: ID.admin, name: 'Kavita Shetty', email: 'admin@rnsit.test', password, role: 'admin', institution: INSTITUTION, collegeId: COLLEGE_ID, institutionDomain: 'rnsit.test', isVerified: true, department: 'Administration', responsibilities: [], isActive: true },
        { _id: ID.principal, name: 'Dr. Suresh Bhat', email: 'principal@rnsit.test', password, role: 'principal', institution: INSTITUTION, collegeId: COLLEGE_ID, institutionDomain: 'rnsit.test', isVerified: true, department: 'Administration', responsibilities: [], isActive: true },
        { _id: ID.dean, name: 'Dr. Meera Nair', email: 'dean@rnsit.test', password, role: 'dean', institution: INSTITUTION, collegeId: COLLEGE_ID, institutionDomain: 'rnsit.test', isVerified: true, department: DEPARTMENT, responsibilities: ['placement_coordinator'], isActive: true },
        { _id: ID.faculty1, name: 'Prof. Asha Rao', email: 'asha@rnsit.test', password, role: 'faculty', institution: INSTITUTION, collegeId: COLLEGE_ID, institutionDomain: 'rnsit.test', isVerified: true, department: DEPARTMENT, responsibilities: ['proctor', 'project_guide', 'club_advisor', 'timetable_coordinator'], isActive: true, skills: ['AI', 'Machine Learning', 'Research'] },
        { _id: ID.faculty2, name: 'Prof. Vikram Shah', email: 'vikram@rnsit.test', password, role: 'faculty', institution: INSTITUTION, collegeId: COLLEGE_ID, institutionDomain: 'rnsit.test', isVerified: true, department: 'Electronics', responsibilities: ['project_guide', 'rnd_staff'], isActive: true },
        { _id: ID.student1, name: 'Ananya Desai', email: 'ananya@rnsit.test', password, role: 'student', institution: INSTITUTION, collegeId: COLLEGE_ID, institutionDomain: 'rnsit.test', isVerified: true, department: DEPARTMENT, degree: 'btech', batch: '2023-2027', semester: 7, section: 'A', cgpa: 9.1, graduationYear: 2027, isPlacementEligible: true, disciplinaryStatus: 'good_standing', skills: ['React', 'Node.js', 'MongoDB'], interests: ['AI', 'Web Development'], responsibilities: [], isActive: true },
        { _id: ID.student2, name: 'Rahul Menon', email: 'rahul@rnsit.test', password, role: 'student', institution: INSTITUTION, collegeId: COLLEGE_ID, institutionDomain: 'rnsit.test', isVerified: true, department: DEPARTMENT, degree: 'btech', batch: '2023-2027', semester: 7, section: 'A', cgpa: 7.4, graduationYear: 2027, isPlacementEligible: true, disciplinaryStatus: 'warning', skills: ['Python', 'Java'], responsibilities: [], isActive: true },
        { _id: ID.student3, name: 'Priya Kulkarni', email: 'priya@rnsit.test', password, role: 'student', institution: INSTITUTION, collegeId: COLLEGE_ID, institutionDomain: 'rnsit.test', isVerified: false, department: 'Electronics', degree: 'btech', batch: '2024-2028', semester: 5, section: 'B', cgpa: 8.2, graduationYear: 2028, isPlacementEligible: false, disciplinaryStatus: 'good_standing', responsibilities: [], isActive: true },
        { _id: ID.alumni, name: 'Kiran Joshi', email: 'kiran@rnsit.test', password, role: 'alumni', institution: INSTITUTION, collegeId: COLLEGE_ID, institutionDomain: 'rnsit.test', isVerified: true, department: DEPARTMENT, graduationYear: 2022, alumniProfile: { company: 'Pragati Digital Systems', designation: 'Software Engineer', industry: 'Technology', yearsExperience: 3, mentorshipInterests: ['Backend', 'Career Planning'] }, responsibilities: [], isActive: true },
        { _id: ID.faculty3, name: 'Prof. Nisha Iyer', email: 'nisha@rnsit.test', password, role: 'faculty', institution: INSTITUTION, collegeId: COLLEGE_ID, institutionDomain: 'rnsit.test', isVerified: true, department: DEPARTMENT, responsibilities: ['project_guide'], isActive: true },
    ]);
    // Social graph: accepted, pending, declined and blocked connection states.
    await index_1.Connection.insertMany([
        { canonicalPair: (0, index_1.getCanonicalPair)(ID.student1, ID.student2), requester: ID.student1, recipient: ID.student2, status: 'accepted', actionBy: ID.student2 },
        { canonicalPair: (0, index_1.getCanonicalPair)(ID.student1, ID.alumni), requester: ID.student1, recipient: ID.alumni, status: 'pending' },
        { canonicalPair: (0, index_1.getCanonicalPair)(ID.student2, ID.faculty1), requester: ID.student2, recipient: ID.faculty1, status: 'declined', actionBy: ID.faculty1 },
        { canonicalPair: (0, index_1.getCanonicalPair)(ID.student3, ID.alumni), requester: ID.student3, recipient: ID.alumni, status: 'blocked', actionBy: ID.alumni },
    ]);
    await index_1.User.updateOne({ _id: ID.student1 }, { $addToSet: { following: ID.student2 } });
    await index_1.User.updateOne({ _id: ID.student2 }, { $addToSet: { followers: ID.student1 } });
    await index_1.Community.insertMany([
        { _id: ID.community1, name: 'AI & Innovation Club', slug: 'ai-innovation-club', description: 'A space for AI projects, talks and peer learning.', category: 'Technology', institution: INSTITUTION, creator: ID.faculty1, members: [ID.faculty1, ID.student1, ID.student2], pendingMembers: [ID.student3], moderators: [ID.student1], clubAdvisors: [ID.faculty1], requiresApproval: true, rules: ['Be respectful', 'Share original work'], announcements: [{ title: 'Welcome', content: 'Welcome to the club.', author: ID.faculty1, createdAt: now }], resources: [{ title: 'Starter guide', url: 'https://example.test/ai-guide', description: 'Introductory resource', type: 'Document', addedBy: ID.faculty1, createdAt: now }] },
        { _id: ID.community2, name: 'Research Circle', slug: 'research-circle', description: 'Research collaboration and paper discussion.', category: 'Research', institution: INSTITUTION, creator: ID.faculty2, members: [ID.faculty2, ID.alumni], requiresApproval: false },
    ]);
    await index_1.Post.insertMany([
        { author: ID.student1, title: 'My first full-stack project', content: 'Built a campus collaboration dashboard.', category: 'Project', institution: INSTITUTION, audience: 'all', visibility: 'institution-only', tags: ['React', 'Node'], community: ID.community1, likes: [ID.student2, ID.alumni], dislikes: [], bookmarks: [ID.student2], sharesCount: 2, comments: [{ user: ID.student2, content: 'Looks great!', replies: [{ user: ID.student1, content: 'Thank you!' }] }], attachments: [ID.file1] },
        { author: ID.faculty1, title: 'Research seminar notice', content: 'Seminar on responsible AI next week.', category: 'Academic Notice', institution: INSTITUTION, audience: 'students', visibility: 'institution-only', tags: ['AI', 'Seminar'], isPinned: true },
        { author: ID.student2, title: 'Need help with algorithms', content: 'How should I approach graph problems?', category: 'Question', institution: INSTITUTION, audience: 'all', visibility: 'public', tags: ['DSA'], isSolved: false },
        { author: ID.student3, title: 'Solved: React state question', content: 'Sharing the solution for controlled inputs.', category: 'Question', institution: INSTITUTION, audience: 'students', visibility: 'institution-only', isSolved: true },
        { author: ID.admin, title: 'Public campus update', content: 'A public platform announcement.', category: 'Campus Announcement', institution: INSTITUTION, audience: 'all', visibility: 'public' },
    ]);
    await index_1.Announcement.insertMany([
        { title: 'All-campus announcement', content: 'Welcome to the new semester.', author: ID.principal, institution: INSTITUTION, targetAudience: 'all', targetRoles: [], targetDepartments: [], targetAcademicYears: [], targetSemesters: [], targetSections: [], category: 'General', isPinned: true },
        { title: 'CSE placement briefing', content: 'Placement briefing for eligible CSE students.', author: ID.dean, institution: INSTITUTION, targetAudience: 'students', targetRoles: ['student'], targetDepartments: [DEPARTMENT], targetAcademicYears: ['2023-2027'], targetSemesters: [7], targetSections: ['A'], category: 'Placement', expiresAt: days(14) },
    ]);
    await index_1.Opportunity.insertMany([
        { _id: ID.opportunity1, title: 'Frontend Engineering Intern', organization: 'Pragati Digital Systems', institution: INSTITUTION, type: 'Internship', location: 'Bengaluru / Hybrid', description: 'Build accessible web interfaces.', requirements: ['React basics'], applicationQuestions: ['Why this role?'], requiredSkills: ['React', 'JavaScript'], eligibleBranches: [DEPARTMENT], eligibleBatches: ['2023-2027'], minimumCgpa: 7, requiresResume: true, package: '₹25,000/month', applicationDeadline: days(20), isActive: true, postedBy: ID.dean },
        { _id: ID.opportunity2, title: 'AI Research Assistant', organization: 'RNS Research Lab', institution: INSTITUTION, type: 'Research Assistantship', location: 'On campus', description: 'Assist with applied ML research.', requiredSkills: ['Python', 'Machine Learning'], eligibleBranches: [DEPARTMENT, 'Electronics'], eligibleBatches: ['2023-2027', '2024-2028'], minimumCgpa: 8, requiresResume: false, applicationDeadline: days(30), isActive: true, postedBy: ID.faculty1 },
        { _id: ID.opportunity3, title: 'Closed Hackathon', organization: 'Campus Innovation Cell', institution: INSTITUTION, type: 'Hackathon', location: 'Online', description: 'A completed test opportunity.', requiredSkills: [], eligibleBranches: [], eligibleBatches: [], isActive: false, postedBy: ID.admin },
    ]);
    await index_1.Application.insertMany([
        { applicant: ID.student1, opportunity: ID.opportunity1, roleApplied: 'Frontend Intern', answers: [{ question: 'Why this role?', answer: 'I enjoy building usable products.' }], status: 'shortlisted', note: 'Available for interview', resumeLink: 'https://example.test/ananya-resume.pdf', reviewerNotes: 'Strong portfolio', idempotencyKey: 'seed-app-001', interviewRounds: [{ name: 'Technical', scheduledAt: days(3), status: 'scheduled' }], selectionStatus: 'pending', offerStatus: 'not_issued', history: [{ status: 'applied', changedBy: ID.student1, changedAt: days(-2) }, { status: 'shortlisted', changedBy: ID.dean, changedAt: now }] },
        { applicant: ID.student2, opportunity: ID.opportunity1, roleApplied: 'Frontend Intern', status: 'rejected', reviewerNotes: 'Does not meet current role requirements', selectionStatus: 'not_selected', offerStatus: 'not_issued', history: [{ status: 'rejected', changedBy: ID.dean, changedAt: now }] },
        { applicant: ID.student3, opportunity: ID.opportunity2, roleApplied: 'Research Assistant', status: 'under_review', selectionStatus: 'pending', offerStatus: 'not_issued', history: [{ status: 'applied', changedBy: ID.student3, changedAt: now }] },
        { applicant: ID.student3, opportunity: ID.opportunity1, roleApplied: 'Frontend Intern', status: 'applied', selectionStatus: 'pending', offerStatus: 'not_issued', idempotencyKey: 'seed-app-004' },
        { applicant: ID.alumni, opportunity: ID.opportunity2, roleApplied: 'Research Mentor', status: 'accepted', selectionStatus: 'selected', offerStatus: 'accepted', history: [{ status: 'accepted', changedBy: ID.faculty1, changedAt: now }] },
        { applicant: ID.student1, opportunity: ID.opportunity2, roleApplied: 'Research Assistant', status: 'withdrawn', selectionStatus: 'pending', offerStatus: 'not_issued', history: [{ status: 'withdrawn', changedBy: ID.student1, changedAt: now }] },
    ]);
    await index_1.UploadedFile.insertMany([
        { _id: ID.file1, uploaderId: ID.student1, originalFileName: 'project-overview.pdf', storedFileName: 'seed-project-overview.pdf', mimeType: 'application/pdf', fileSizeBytes: 120000, storageProvider: 'local', filePath: 'uploads/seed-project-overview.pdf', fileUrl: 'https://example.test/files/project-overview.pdf', sha256Hash: 'a'.repeat(64), associatedEntityType: 'post', associatedEntityId: oid(801), accessPolicy: 'institutional', institution: INSTITUTION, allowedUserIds: [ID.faculty1], isQuarantined: false, virusScanClean: true },
        { _id: ID.file2, uploaderId: ID.faculty1, originalFileName: 'research-dataset.csv', storedFileName: 'seed-research-dataset.csv', mimeType: 'text/csv', fileSizeBytes: 45000, storageProvider: 'local', filePath: 'uploads/seed-research-dataset.csv', sha256Hash: 'b'.repeat(64), associatedEntityType: 'research_dataset', associatedEntityId: ID.paper1, accessPolicy: 'restricted', institution: INSTITUTION, allowedUserIds: [ID.faculty1, ID.student1], isQuarantined: false, virusScanClean: true },
        { _id: ID.file3, uploaderId: ID.admin, originalFileName: 'public-event-poster.png', storedFileName: 'seed-public-event-poster.png', mimeType: 'image/png', fileSizeBytes: 24000, storageProvider: 'local', filePath: 'uploads/seed-public-event-poster.png', sha256Hash: 'c'.repeat(64), associatedEntityType: 'event', associatedEntityId: ID.event1, accessPolicy: 'public', allowedUserIds: [], isQuarantined: false, virusScanClean: true },
        { _id: ID.file4, uploaderId: ID.student1, originalFileName: 'private-notes.pdf', storedFileName: 'seed-private-notes.pdf', mimeType: 'application/pdf', fileSizeBytes: 18000, storageProvider: 'local', filePath: 'uploads/seed-private-notes.pdf', sha256Hash: 'd'.repeat(64), associatedEntityType: 'project_document', accessPolicy: 'private', institution: INSTITUTION, allowedUserIds: [ID.student1], isQuarantined: false, virusScanClean: true },
    ]);
    await index_1.Event.insertMany([
        { _id: ID.event1, title: 'AI Innovation Summit', description: 'Talks, demos and networking.', institution: INSTITUTION, organizer: ID.faculty1, status: 'published', approvedBy: ID.dean, approvedAt: days(-2), publishedAt: days(-1), mode: 'hybrid', venue: 'Main Auditorium', onlineMeetingUrl: 'https://meet.example.test/ai-summit', startDate: days(7), endDate: days(7.1), registrationOpenDate: days(-5), registrationCloseDate: days(6), audience: 'all', eligibility: { targetInstitutions: [INSTITUTION], targetDepartments: [DEPARTMENT], targetBatches: ['2023-2027'], targetSemesters: [7], targetRoles: ['student', 'faculty'], minCgpa: 6 }, capacity: 3, allocatedSeats: 2, registrationLockVersion: 2, isTeamEvent: false, minTeamSize: 1, maxTeamSize: 1, allowWaitlist: true, coordinators: [{ userId: ID.student1, name: 'Ananya Desai', role: 'Student Coordinator' }], sponsors: [{ name: 'Pragati Digital Systems', tier: 'gold' }], flyerUrl: 'https://example.test/ai-summit.png', files: [{ fileId: ID.file1, fileType: 'flyer', url: 'https://example.test/ai-summit.png', originalName: 'summit.png' }], schedule: [{ title: 'Opening keynote', startTime: days(7), endTime: new Date(days(7).getTime() + 3600000), speaker: 'Prof. Vikram Shah' }], category: 'Technology', tags: ['AI', 'Networking'], idempotencyKeys: [] },
        { _id: ID.event2, title: 'Inter-college Robotics Challenge', description: 'Team robotics competition.', institution: INSTITUTION, organizer: ID.dean, status: 'pending_review', mode: 'in_person', venue: 'Innovation Lab', startDate: days(25), endDate: days(25.2), audience: 'students', eligibility: { targetInstitutions: [], targetDepartments: ['Electronics', DEPARTMENT], targetBatches: [], targetSemesters: [], targetRoles: ['student'] }, capacity: 20, allocatedSeats: 0, isTeamEvent: true, minTeamSize: 2, maxTeamSize: 5, allowWaitlist: true, category: 'Competition', tags: ['Robotics'] },
        { _id: ID.event3, title: 'Cancelled Guest Lecture', description: 'Cancelled event test case.', institution: INSTITUTION, organizer: ID.faculty2, status: 'cancelled', cancellationReason: 'Speaker unavailable', cancelledBy: ID.admin, cancelledAt: now, mode: 'online', onlineMeetingUrl: 'https://meet.example.test/cancelled', startDate: days(-2), endDate: days(-2), audience: 'all', eligibility: {}, capacity: 0, allocatedSeats: 0, isTeamEvent: false, minTeamSize: 1, maxTeamSize: 1, allowWaitlist: false, category: 'Lecture' },
        { _id: ID.event4, title: 'Draft Student Meetup', description: 'Unpublished draft event.', institution: INSTITUTION, organizer: ID.student1, status: 'draft', mode: 'in_person', venue: 'Seminar Room', startDate: days(40), endDate: days(40.1), audience: 'students', eligibility: {}, capacity: 30, allocatedSeats: 0, category: 'Meetup' },
        { _id: ID.event5, title: 'Approved Career Talk', description: 'Approved but not yet published.', institution: INSTITUTION, organizer: ID.faculty1, status: 'approved', approvedBy: ID.dean, approvedAt: now, mode: 'online', onlineMeetingUrl: 'https://meet.example.test/career', startDate: days(18), endDate: days(18.1), audience: 'all', eligibility: {}, capacity: 100, allocatedSeats: 0, category: 'Career' },
        { _id: ID.event6, title: 'Rejected Workshop', description: 'Rejected event review case.', institution: INSTITUTION, organizer: ID.student2, status: 'rejected', rejectionReason: 'Insufficient event details', mode: 'in_person', venue: 'Lab 1', startDate: days(22), endDate: days(22.1), audience: 'students', eligibility: {}, capacity: 20, allocatedSeats: 0, category: 'Workshop' },
        { _id: ID.event7, title: 'Ongoing Project Expo', description: 'Event currently in progress.', institution: INSTITUTION, organizer: ID.dean, status: 'ongoing', mode: 'hybrid', venue: 'Expo Hall', startDate: days(-0.2), endDate: days(0.2), audience: 'all', eligibility: {}, capacity: 0, allocatedSeats: 0, category: 'Expo' },
        { _id: ID.event8, title: 'Completed Coding Contest', description: 'Past event for archive/history screens.', institution: INSTITUTION, organizer: ID.faculty2, status: 'completed', mode: 'online', startDate: days(-10), endDate: days(-9), audience: 'students', eligibility: {}, capacity: 50, allocatedSeats: 12, category: 'Competition' },
    ]);
    await index_1.EventRegistration.insertMany([
        { eventId: ID.event1, userId: ID.student1, status: 'registered', teamMembers: [], seatsAllocated: 1, attendanceMarked: false, ticketCode: 'NSTAR-EVT1-001' },
        { eventId: ID.event1, userId: ID.student2, status: 'attended', teamMembers: [], seatsAllocated: 1, attendanceMarked: true, attendedAt: now, ticketCode: 'NSTAR-EVT1-002' },
        { eventId: ID.event1, userId: ID.student3, status: 'waitlisted', teamMembers: [], seatsAllocated: 1, attendanceMarked: false, ticketCode: 'NSTAR-EVT1-003', waitlistPosition: 1 },
        { eventId: ID.event2, userId: ID.student2, status: 'cancelled', teamMembers: [], seatsAllocated: 1, attendanceMarked: false, ticketCode: 'NSTAR-EVT2-001', cancelledAt: now, cancelledReason: 'Schedule conflict' },
    ]);
    await index_1.AcademicCalendar.create({ institution: INSTITUTION, collegeId: COLLEGE_ID, academicYear: '2026-2027', semesterType: 'odd', createdBy: ID.admin, isPublished: true, events: [
            { title: 'Semester begins', type: 'semester_start', startDate: days(-30), endDate: days(-30), isHoliday: false, targetDepartments: [], targetBatches: [] },
            { title: 'Internal assessment', type: 'internal_assessment', startDate: days(10), endDate: days(12), isHoliday: false, targetDepartments: [DEPARTMENT], targetBatches: ['2023-2027'] },
            { title: 'Public holiday', type: 'holiday', startDate: days(15), endDate: days(15), isHoliday: true },
            { title: 'Cultural fest', type: 'cultural_fest', startDate: days(35), endDate: days(36), isHoliday: false },
        ] });
    await index_1.Timetable.insertMany([
        { institution: INSTITUTION, collegeId: COLLEGE_ID, department: DEPARTMENT, semester: 7, section: 'A', academicYear: '2026-2027', dayOfWeek: 1, startMinutes: minutes(9), endMinutes: minutes(10), courseCode: 'CS701', courseName: 'Distributed Systems', facultyId: ID.faculty1, roomNumber: 'C-301', building: 'C Block', sessionType: 'lecture', effectiveFrom: days(-30), revision: 1, publishedAt: now, createdBy: ID.admin, sectionId: 'CSE-7-A', isActive: true },
        { institution: INSTITUTION, collegeId: COLLEGE_ID, department: DEPARTMENT, semester: 7, section: 'A', academicYear: '2026-2027', dayOfWeek: 1, startMinutes: minutes(10), endMinutes: minutes(12), courseCode: 'CS702L', courseName: 'Distributed Systems Lab', facultyId: ID.faculty2, roomNumber: 'Lab-2', building: 'C Block', sessionType: 'laboratory', effectiveFrom: days(-30), revision: 1, publishedAt: now, createdBy: ID.admin, sectionId: 'CSE-7-A', isActive: true },
        { institution: INSTITUTION, collegeId: COLLEGE_ID, department: DEPARTMENT, semester: 7, section: 'A', academicYear: '2026-2027', dayOfWeek: 2, startMinutes: minutes(11), endMinutes: minutes(12), courseCode: 'CS703', courseName: 'Software Engineering', facultyId: ID.faculty1, roomNumber: 'C-302', building: 'C Block', sessionType: 'lecture', effectiveFrom: days(-30), revision: 1, createdBy: ID.admin, sectionId: 'CSE-7-A', isActive: true },
        { institution: INSTITUTION, collegeId: COLLEGE_ID, department: DEPARTMENT, semester: 7, section: 'A', academicYear: '2026-2027', dayOfWeek: 3, startMinutes: minutes(13), endMinutes: minutes(14), courseCode: 'CS704T', courseName: 'Algorithms Tutorial', facultyId: ID.faculty3, roomNumber: 'C-201', building: 'C Block', sessionType: 'tutorial', effectiveFrom: days(-30), revision: 1, createdBy: ID.admin, sectionId: 'CSE-7-A', isActive: true },
        { institution: INSTITUTION, collegeId: COLLEGE_ID, department: DEPARTMENT, semester: 7, section: 'A', academicYear: '2026-2027', dayOfWeek: 5, startMinutes: minutes(9), endMinutes: minutes(12), courseCode: 'CS705E', courseName: 'End Semester Examination', facultyId: ID.faculty2, roomNumber: 'Exam-Hall-1', building: 'Main Block', sessionType: 'exam', effectiveFrom: days(40), revision: 1, createdBy: ID.admin, sectionId: 'CSE-7-A', isActive: true },
    ]);
    await index_1.TimetableWriteLock.create({ institution: INSTITUTION, department: DEPARTMENT, version: 3 });
    await index_1.MentorshipRequest.insertMany([
        { student: ID.student1, mentor: ID.faculty1, subject: 'Final-year project guidance', message: 'I would like guidance on my AI project.', goals: ['Research planning', 'Project review'], status: 'accepted', responseNote: 'Accepted for weekly meetings', respondedAt: now },
        { student: ID.student2, mentor: ID.alumni, subject: 'Career preparation', message: 'Please help me prepare for interviews.', goals: ['Resume', 'Interview practice'], status: 'pending' },
        { student: ID.student3, mentor: ID.faculty2, subject: 'Embedded systems', message: 'Looking for project guidance.', goals: ['Hardware design'], status: 'declined', responseNote: 'No current capacity', respondedAt: now },
    ]);
    await index_1.MentorshipBinding.insertMany([
        { student: ID.student1, faculty: ID.faculty1, assignmentType: 'proctor', department: DEPARTMENT, institution: INSTITUTION, collegeId: COLLEGE_ID, status: 'active' },
        { student: ID.student1, faculty: ID.faculty1, assignmentType: 'project_guide', collaborationId: ID.collaboration1, department: DEPARTMENT, institution: INSTITUTION, collegeId: COLLEGE_ID, status: 'active' },
        { student: ID.student2, faculty: ID.faculty2, assignmentType: 'proctor', department: DEPARTMENT, institution: INSTITUTION, collegeId: COLLEGE_ID, status: 'active' },
        { student: ID.student3, faculty: ID.faculty3, assignmentType: 'proctor', department: 'Electronics', institution: INSTITUTION, collegeId: COLLEGE_ID, status: 'terminated', terminatedAt: now },
        { student: ID.student3, faculty: ID.faculty2, assignmentType: 'project_guide', department: 'Electronics', institution: INSTITUTION, collegeId: COLLEGE_ID, status: 'transferred', terminatedAt: now },
    ]);
    await index_1.ResearchCollaboration.insertMany([
        { _id: ID.collaboration2, title: 'Open Research Collaboration', description: 'Recruiting members for a new study.', leadResearcher: ID.faculty2, institution: INSTITUTION, department: 'Electronics', subject: 'Embedded Systems', requiredSkills: ['C', 'IoT'], openRoles: [{ roleTitle: 'Firmware Developer', vacancies: 2, filled: 0 }], visibility: 'public', status: 'open', tags: ['IoT'] },
        { _id: ID.collaboration3, title: 'Completed Vision Study', description: 'Completed computer vision collaboration.', leadResearcher: ID.faculty1, institution: INSTITUTION, department: DEPARTMENT, subject: 'Computer Vision', requiredSkills: ['Python'], visibility: 'institution-only', status: 'completed', tags: ['Vision'] },
    ]);
    await index_1.ResearchCollaboration.create({ _id: ID.collaboration1, title: 'Explainable AI for Student Support', description: 'A student-faculty research project exploring interpretable ML.', leadResearcher: ID.faculty1, supervisor: ID.faculty2, institution: INSTITUTION, department: DEPARTMENT, subject: 'Artificial Intelligence', requiredSkills: ['Python', 'Machine Learning'], openRoles: [{ roleTitle: 'Data Analyst', description: 'Analyze model outputs', vacancies: 2, filled: 1 }, { roleTitle: 'Frontend Developer', description: 'Build a research dashboard', vacancies: 1, filled: 0 }], teamMembers: [{ user: ID.student1, role: 'Student Researcher' }, { user: ID.faculty1, role: 'Lead Researcher' }], applications: [{ applicant: ID.student2, roleSought: 'Data Analyst', statement: 'Interested in applied ML.', relevantSkills: ['Python'], interests: ['AI'], status: 'shortlisted' }, { applicant: ID.student3, roleSought: 'Frontend Developer', statement: 'I can build the dashboard.', relevantSkills: ['React'], interests: ['UI'], status: 'pending' }], visibility: 'institution-only', status: 'in_progress', tags: ['XAI', 'Education'], externalLinks: [{ title: 'Project brief', url: 'https://example.test/xai-brief' }] });
    await index_1.ResearchPaper.insertMany([
        { _id: ID.paper1, title: 'Interpretable Models for Student Outcome Prediction', abstract: 'A study of explainable models for educational analytics.', authors: [{ name: 'Ananya Desai', user: ID.student1, institution: INSTITUTION }, { name: 'Asha Rao', user: ID.faculty1, institution: INSTITUTION }], authorIds: [ID.student1, ID.faculty1], primaryAuthorId: ID.student1, publicationType: 'Conference Paper', subject: 'Artificial Intelligence', department: DEPARTMENT, collegeId: COLLEGE_ID, externalUrl: 'https://example.test/paper-1', fileAttachmentId: ID.file1, datasetFileId: ID.file2, publicationDate: days(-10), tags: ['Explainable AI', 'Education'], institution: INSTITUTION, visibility: 'institution-only', submittedBy: ID.student1, isStudentSubmission: true, lifecycleStatus: 'pending_guide', collaborationId: ID.collaboration1, assignedProctorId: ID.faculty1, assignedProjectGuideId: ID.faculty2, assignedProjectGuideIds: [ID.faculty2], revisionRound: 1, reviewHistory: [{ revisionRound: 1, submittedAt: days(-2), submittedBy: ID.student1 }], citations: 0, downloadCount: 4 },
        { _id: ID.paper2, title: 'A Survey of Edge AI', abstract: 'A survey of machine learning at the edge.', authors: [{ name: 'Kiran Joshi', user: ID.alumni }], authorIds: [ID.alumni], primaryAuthorId: ID.alumni, publicationType: 'Journal Paper', subject: 'Edge Computing', doi: '10.5555/seed.edgeai.2026', publicationDate: days(-100), tags: ['Edge AI'], institution: INSTITUTION, visibility: 'public', submittedBy: ID.alumni, lifecycleStatus: 'published', citations: 12, downloadCount: 87 },
        { _id: ID.paper3, title: 'Draft on Secure IoT Systems', abstract: 'An early draft awaiting submission.', authors: [{ name: 'Rahul Menon', user: ID.student2 }], authorIds: [ID.student2], primaryAuthorId: ID.student2, publicationType: 'Preprint', subject: 'IoT Security', institution: INSTITUTION, visibility: 'institution-only', submittedBy: ID.student2, isStudentSubmission: true, lifecycleStatus: 'draft', assignedProctorId: ID.faculty1, revisionRound: 1, citations: 0, downloadCount: 0 },
    ]);
    await index_1.ResearchPaper.insertMany([
        { _id: ID.paper4, title: 'Submitted IoT Security Study', abstract: 'Submitted and awaiting routing.', authors: [{ name: 'Rahul Menon', user: ID.student2 }], authorIds: [ID.student2], subject: 'IoT Security', institution: INSTITUTION, submittedBy: ID.student2, isStudentSubmission: true, lifecycleStatus: 'submitted', revisionRound: 1, citations: 0, downloadCount: 0 },
        { _id: ID.paper5, title: 'Pending Proctor Review', abstract: 'Waiting for proctor review.', authors: [{ name: 'Priya Kulkarni', user: ID.student3 }], authorIds: [ID.student3], subject: 'Embedded Systems', institution: INSTITUTION, submittedBy: ID.student3, isStudentSubmission: true, lifecycleStatus: 'pending_proctor', assignedProctorId: ID.faculty1, revisionRound: 1, citations: 0, downloadCount: 0 },
        { _id: ID.paper6, title: 'Approved Research Record', abstract: 'Approved but not yet published.', authors: [{ name: 'Ananya Desai', user: ID.student1 }], authorIds: [ID.student1], subject: 'Software Engineering', institution: INSTITUTION, submittedBy: ID.student1, isStudentSubmission: true, lifecycleStatus: 'approved', assignedProctorId: ID.faculty1, assignedProjectGuideId: ID.faculty2, revisionRound: 1, citations: 0, downloadCount: 0 },
        { _id: ID.paper7, title: 'Rejected Research Record', abstract: 'Rejected review outcome.', authors: [{ name: 'Rahul Menon', user: ID.student2 }], authorIds: [ID.student2], subject: 'Networks', institution: INSTITUTION, submittedBy: ID.student2, isStudentSubmission: true, lifecycleStatus: 'rejected', assignedProctorId: ID.faculty1, revisionRound: 1, citations: 0, downloadCount: 0 },
        { _id: ID.paper8, title: 'Archived Research Record', abstract: 'Archived historical publication.', authors: [{ name: 'Kiran Joshi', user: ID.alumni }], authorIds: [ID.alumni], subject: 'Distributed Systems', institution: INSTITUTION, submittedBy: ID.alumni, lifecycleStatus: 'archived', isLegacyPaper: true, revisionRound: 1, citations: 2, downloadCount: 10 },
    ]);
    await index_1.ResearchReview.insertMany([
        { paperId: ID.paper1, reviewerId: ID.faculty1, reviewerRole: 'proctor', verdict: 'approved', comments: 'Scope and ethics look appropriate.', criteriaScores: { novelty: 8, methodology: 7, clarity: 8, ethicalCompliance: true }, revisionRound: 1 },
        { paperId: ID.paper1, reviewerId: ID.faculty2, reviewerRole: 'project_guide', verdict: 'changes_requested', comments: 'Clarify the evaluation dataset.', criteriaScores: { novelty: 8, methodology: 6, clarity: 7, ethicalCompliance: true }, revisionRound: 1 },
        { paperId: ID.paper7, reviewerId: ID.faculty1, reviewerRole: 'proctor', verdict: 'rejected', comments: 'The submission needs substantial methodological work.', criteriaScores: { novelty: 3, methodology: 2, clarity: 5, ethicalCompliance: false }, revisionRound: 1 },
    ]);
    await index_1.CareerQuestion.create({ author: ID.student2, assignedMentor: ID.alumni, visibility: 'public', title: 'How should I prepare for backend interviews?', body: 'I know JavaScript and basic databases. What should I focus on?', attachmentIds: [], followUps: [{ author: ID.student2, content: 'I have six weeks to prepare.' }], tags: ['Career', 'Backend'], targetDepartments: [DEPARTMENT], institution: INSTITUTION, answers: [{ responder: ID.alumni, content: 'Practice APIs, database design and problem solving.', isVerifiedFaculty: false, isEndorsed: true }, { responder: ID.faculty1, content: 'Also review networking and security basics.', isVerifiedFaculty: true, isEndorsed: false }], isClosed: false, flaggedForModeration: false });
    await index_1.CareerQuestion.create({ author: ID.student3, visibility: 'public', title: 'Flagged question for moderation', body: 'A sample question awaiting moderator review.', attachmentIds: [], tags: ['Moderation'], targetDepartments: ['Electronics'], institution: INSTITUTION, answers: [], isClosed: true, flaggedForModeration: true });
    await index_1.CareerQuestion.create({ author: ID.student1, assignedMentor: ID.faculty1, visibility: 'private_to_mentor', title: 'Private project feedback', body: 'Can you review my project direction?', attachmentIds: [], tags: ['Project'], targetDepartments: [DEPARTMENT], institution: INSTITUTION, answers: [], isClosed: false, flaggedForModeration: false });
    await index_1.Conversation.create([
        { _id: ID.conversation1, isGroup: false, canonicalDirectPair: (0, index_1.getCanonicalDirectPair)(ID.student1, ID.faculty1), participants: [ID.student1, ID.faculty1], admins: [], institution: INSTITUTION, lastMessageAt: now },
        { _id: ID.conversation2, isGroup: true, name: 'AI Summit Organizers', participants: [ID.student1, ID.faculty1, ID.student2], admins: [ID.faculty1], institution: INSTITUTION, lastMessageAt: now },
    ]);
    const messages = await index_1.Message.insertMany([
        { conversationId: ID.conversation1, sender: ID.student1, content: 'Could we review my project proposal?', attachments: [], readBy: [{ userId: ID.faculty1, readAt: now }], deliveredTo: [ID.faculty1], clientMessageId: 'seed-msg-001', isSystemNotice: false },
        { conversationId: ID.conversation1, sender: ID.faculty1, content: 'Yes. Please share the latest draft.', attachments: [ID.file1], readBy: [], deliveredTo: [ID.student1], clientMessageId: 'seed-msg-002', isSystemNotice: false },
        { conversationId: ID.conversation2, sender: ID.faculty1, content: 'Welcome organizers. Please coordinate here.', attachments: [], readBy: [], deliveredTo: [ID.student1, ID.student2], clientMessageId: 'seed-msg-003', isSystemNotice: true },
    ]);
    await index_1.Conversation.updateOne({ _id: ID.conversation1 }, { $set: { lastMessage: messages[1]._id, lastMessageAt: messages[1].createdAt } });
    await index_1.Conversation.updateOne({ _id: ID.conversation2 }, { $set: { lastMessage: messages[2]._id, lastMessageAt: messages[2].createdAt } });
    await index_1.Notification.insertMany([
        { recipient: ID.student1, sender: ID.student2, type: 'like', message: 'Rahul liked your post.', entityId: 'post-seed-1', isRead: false, deliveryStatus: 'delivered', attempts: 1, idempotencyKey: 'seed-notif-001' },
        { recipient: ID.student1, sender: ID.faculty1, type: 'application_status', message: 'Your application was shortlisted.', entityId: ID.opportunity1.toString(), isRead: false, deliveryStatus: 'pending', attempts: 0, nextAttemptAt: days(0), idempotencyKey: 'seed-notif-002' },
        { recipient: ID.student2, sender: ID.faculty1, type: 'collaboration_invite', message: 'You have been shortlisted for a research role.', entityId: ID.collaboration1.toString(), isRead: true, deliveryStatus: 'failed', attempts: 3, lastAttemptAt: now, failureReason: 'Simulated delivery failure', idempotencyKey: 'seed-notif-003' },
    ]);
    await index_1.NotificationPreference.create({ userId: ID.student1, inAppAlerts: true, opportunityAlerts: true, eventAlerts: false, researchAlerts: true, communityAlerts: true, messagingAlerts: true });
    await index_1.Subscription.insertMany([
        { user: ID.student1, targetType: 'topic', targetId: 'artificial-intelligence', targetName: 'Artificial Intelligence', preferences: { inAppAlerts: true, emailAlerts: false } },
        { user: ID.student1, targetType: 'community', targetId: ID.community1.toString(), targetName: 'AI & Innovation Club', preferences: { inAppAlerts: true, emailAlerts: true } },
        { user: ID.student2, targetType: 'opportunity_category', targetId: 'Internship', targetName: 'Internships', preferences: { inAppAlerts: true, emailAlerts: true } },
        { user: ID.student1, targetType: 'department', targetId: DEPARTMENT, targetName: DEPARTMENT, preferences: { inAppAlerts: true, emailAlerts: false } },
        { user: ID.student2, targetType: 'institution', targetId: COLLEGE_ID, targetName: INSTITUTION, preferences: { inAppAlerts: false, emailAlerts: true } },
        { user: ID.alumni, targetType: 'research_subject', targetId: 'Edge Computing', targetName: 'Edge Computing', preferences: { inAppAlerts: true, emailAlerts: true } },
        { user: ID.alumni, targetType: 'researcher', targetId: ID.faculty1.toString(), targetName: 'Prof. Asha Rao', preferences: { inAppAlerts: true, emailAlerts: false } },
    ]);
    await index_1.Report.insertMany([
        { reporter: ID.student1, targetType: 'post', targetId: 'seed-post-spam', reason: 'Spam content', status: 'pending' },
        { reporter: ID.student2, targetType: 'user', targetId: ID.student3.toString(), reason: 'Impersonation concern', status: 'resolved' },
        { reporter: ID.alumni, targetType: 'community', targetId: ID.community2.toString(), reason: 'Outdated information', status: 'dismissed' },
    ]);
    // Hash-linked audit examples; sequence 1 starts from the GENESIS hash.
    const auditEntries = [
        { actorId: ID.admin, actorRole: 'admin', action: 'SEED_CREATE', entityType: 'User', entityId: ID.admin, institution: INSTITUTION, reason: 'Initial development seed' },
        { actorId: ID.faculty1, actorRole: 'faculty', action: 'PAPER_REVIEW', entityType: 'ResearchPaper', entityId: ID.paper1, institution: INSTITUTION, reason: 'Proctor review completed' },
    ];
    let previousHash = 'GENESIS';
    for (let i = 0; i < auditEntries.length; i++) {
        const entry = auditEntries[i];
        const timestamp = new Date(now.getTime() + i);
        const payload = JSON.stringify({ ...entry, sequence: i + 1, timestamp: timestamp.toISOString(), previousHash });
        const hash = (0, node_crypto_1.createHash)('sha256').update(payload).digest('hex');
        await index_1.AuditLog.create({ ...entry, timestamp, sequence: i + 1, previousHash, hash, newStateSnapshot: { seeded: true } });
        previousHash = hash;
    }
    await index_1.AuditHead.create({ _id: 'global', sequence: auditEntries.length, hash: previousHash });
    console.log('\nSeed completed successfully.');
    console.log('Test login password:', PASSWORD);
    console.log('Users: superadmin, admin, principal, dean, 3 faculty, 3 students, 1 alumni');
    console.log('Seeded modules: social, communities, opportunities, applications, files, events, academic calendar, timetable, mentorship, research, career Q&A, messaging, notifications, subscriptions, reports and audit.');
}
seed()
    .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
})
    .finally(async () => {
    await mongoose_1.default.disconnect();
});
