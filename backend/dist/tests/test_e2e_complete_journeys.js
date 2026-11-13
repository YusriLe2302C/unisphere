"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("../app.js");
const db_js_1 = require("../config/db.js");
const User_js_1 = require("../models/User.js");
const Post_js_1 = require("../models/Post.js");
const Opportunity_js_1 = require("../models/Opportunity.js");
const ResearchCollaboration_js_1 = require("../models/ResearchCollaboration.js");
const ResearchPaper_js_1 = require("../models/ResearchPaper.js");
const Notification_js_1 = require("../models/Notification.js");
const Subscription_js_1 = require("../models/Subscription.js");
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_js_1 = require("../middleware/auth.js");
const runE2EValidation = async () => {
    console.log('================================================================');
    console.log('=== STARTING 12-JOURNEY END-TO-END RELEASE READINESS SUITE ===');
    console.log('================================================================\n');
    await (0, db_js_1.connectDB)();
    const app = (0, app_js_1.createApp)();
    const server = app.listen(5007);
    try {
        const baseUrl = 'http://localhost:5007/api';
        const secret = (0, auth_js_1.getJwtSecret)();
        const ts = Date.now();
        // Setup Test Personas
        const publisher = await User_js_1.User.create({
            name: `Prof. Publisher ${ts}`,
            email: `publisher_${ts}@cambridge.ac.in`,
            password: 'HashedPassword123!',
            role: 'faculty',
            institution: 'Consortium University A',
            department: 'Computer Science',
            isVerified: true
        });
        const tokenPublisher = jsonwebtoken_1.default.sign({ id: publisher._id, ver: publisher.tokenVersion, email: publisher.email, role: publisher.role, institution: publisher.institution }, secret, { expiresIn: '1h' });
        const subscriber = await User_js_1.User.create({
            name: `Alice Subscriber ${ts}`,
            email: `alice_${ts}@cambridge.ac.in`,
            password: 'HashedPassword123!',
            role: 'student',
            institution: 'Consortium University A',
            department: 'Computer Science',
            isVerified: true
        });
        const tokenSubscriber = jsonwebtoken_1.default.sign({ id: subscriber._id, ver: subscriber.tokenVersion, email: subscriber.email, role: subscriber.role, institution: subscriber.institution }, secret, { expiresIn: '1h' });
        const student2 = await User_js_1.User.create({
            name: `Bob Student ${ts}`,
            email: `bob_${ts}@cambridge.ac.in`,
            password: 'HashedPassword123!',
            role: 'student',
            institution: 'Consortium University A',
            department: 'Computer Science',
            isVerified: true
        });
        const tokenStudent2 = jsonwebtoken_1.default.sign({ id: student2._id, ver: student2.tokenVersion, email: student2.email, role: student2.role, institution: student2.institution }, secret, { expiresIn: '1h' });
        const student3 = await User_js_1.User.create({
            name: `Charlie Student ${ts}`,
            email: `charlie_${ts}@cambridge.ac.in`,
            password: 'HashedPassword123!',
            role: 'student',
            institution: 'Consortium University A',
            department: 'Computer Science',
            isVerified: true
        });
        const tokenStudent3 = jsonwebtoken_1.default.sign({ id: student3._id, ver: student3.tokenVersion, email: student3.email, role: student3.role, institution: student3.institution }, secret, { expiresIn: '1h' });
        const otherInstUser = await User_js_1.User.create({
            name: `Eve Outside ${ts}`,
            email: `eve_${ts}@other.edu`,
            password: 'HashedPassword123!',
            role: 'student',
            institution: 'External College B',
            department: 'Physics',
            isVerified: true
        });
        const tokenOther = jsonwebtoken_1.default.sign({ id: otherInstUser._id, ver: otherInstUser.tokenVersion, email: otherInstUser.email, role: otherInstUser.role, institution: otherInstUser.institution }, secret, { expiresIn: '1h' });
        const admin = await User_js_1.User.create({
            name: `Global Admin ${ts}`,
            email: `admin_${ts}@hub.org`,
            password: 'HashedPassword123!',
            role: 'admin',
            institution: 'Consortium University A',
            isVerified: true
        });
        const tokenAdmin = jsonwebtoken_1.default.sign({ id: admin._id, ver: admin.tokenVersion, email: admin.email, role: admin.role, institution: admin.institution }, secret, { expiresIn: '1h' });
        console.log('✓ Personas initialized.\n');
        // JOURNEY 1 & 2: Publisher creates announcement, subscriber receives feed update and alert
        console.log('--- Journey 1 & 2: Publisher Announcement, Audience Selection, & Subscriber Delivery ---');
        // Subscriber subscribes to topic 'ai-research'
        await Subscription_js_1.Subscription.create({
            user: subscriber._id,
            targetType: 'topic',
            targetId: 'ai-research',
            targetName: '#ai-research'
        });
        const pubRes = await fetch(`${baseUrl}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenPublisher}` },
            body: JSON.stringify({
                title: 'New AI Lab Grants Available',
                content: 'Funding open for students in CS and AI.',
                category: 'Campus Announcement',
                tags: ['ai-research'],
                audience: 'students',
                visibility: 'public'
            })
        });
        const pubData = await pubRes.json();
        console.log(`Announcement published: HTTP ${pubRes.status}`);
        const subNotif = await Notification_js_1.Notification.findOne({ recipient: subscriber._id, entityId: pubData.post._id.toString() });
        if (pubRes.status === 201 && subNotif) {
            console.log('PASS: Announcement published and delivered to topic subscriber notification feed.\n');
        }
        else {
            throw new Error('FAIL in Journey 1/2');
        }
        // JOURNEY 3 & 4: Event Discovery, RSVP, Capacity Limit, Waitlist, and Auto-Promotion
        console.log('--- Journey 3 & 4: Event Discovery, Capacity Overflow, Waitlist, & Cancellation Auto-Promotion ---');
        const eventPost = await Post_js_1.Post.create({
            author: publisher._id,
            title: 'Exclusive Robotics Masterclass',
            content: 'Capped at 1 seat for testing waitlist mechanics.',
            category: 'Workshop & Seminar',
            institution: publisher.institution,
            eventDetails: {
                capacity: 1, // Only 1 seat
                registeredAttendees: [],
                waitlist: [],
                attendedAttendees: [],
                isCancelled: false
            }
        });
        // Student 1 registers -> Confirmed seat
        const rsvp1Res = await fetch(`${baseUrl}/posts/${eventPost._id}/event-register`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tokenSubscriber}` }
        });
        const rsvp1Data = await rsvp1Res.json();
        console.log(`Student 1 RSVP: confirmed=${rsvp1Data.isRegistered}, waitlisted=${rsvp1Data.isWaitlisted}, count=${rsvp1Data.attendeeCount}`);
        // Student 2 registers -> Event is full (capacity: 1) -> Added to Waitlist!
        const rsvp2Res = await fetch(`${baseUrl}/posts/${eventPost._id}/event-register`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tokenStudent2}` }
        });
        const rsvp2Data = await rsvp2Res.json();
        console.log(`Student 2 RSVP (Event Full): confirmed=${rsvp2Data.isRegistered}, waitlisted=${rsvp2Data.isWaitlisted}, waitlistCount=${rsvp2Data.waitlistCount}`);
        if (!rsvp1Data.isRegistered || !rsvp2Data.isWaitlisted) {
            throw new Error('FAIL in Journey 3/4: Capacity or waitlist assignment failed.');
        }
        // Student 1 cancels their RSVP -> Student 2 should automatically be promoted from waitlist to confirmed!
        const cancelRes = await fetch(`${baseUrl}/posts/${eventPost._id}/event-register`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tokenSubscriber}` }
        });
        const cancelData = await cancelRes.json();
        console.log(`Student 1 cancels RSVP: HTTP ${cancelRes.status}, remaining registered=${cancelData.attendeeCount}`);
        // Verify Student 2 was auto-promoted into registeredAttendees!
        const updatedPost = await Post_js_1.Post.findById(eventPost._id);
        const isStudent2Promoted = (updatedPost?.eventDetails?.registeredAttendees || []).some(id => id.toString() === student2._id.toString());
        const isWaitlistEmpty = (updatedPost?.eventDetails?.waitlist || []).length === 0;
        if (isStudent2Promoted && isWaitlistEmpty) {
            console.log('PASS: Full registration list handled with waitlist, and cancellation triggered instant auto-promotion!\n');
        }
        else {
            throw new Error('FAIL in Journey 4: Waitlist auto-promotion did not execute.');
        }
        // JOURNEY 5 & 6: Club Recruitment, Applications, Status Updates & Tracking
        console.log('--- Journey 5 & 6: Club Recruitment Publishing, Application, Status Updates, & Tracking ---');
        const clubOpp = await Opportunity_js_1.Opportunity.create({
            title: 'Robotics Club Hardware Designer',
            organization: 'Robotics Society',
            institution: publisher.institution,
            type: 'Club Recruitment',
            description: 'Design custom PCBs',
            postedBy: publisher._id
        });
        // Student 3 submits application
        const appRes = await fetch(`${baseUrl}/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudent3}` },
            body: JSON.stringify({
                opportunityId: clubOpp._id,
                roleApplied: 'Hardware Designer',
                answers: [{ question: 'EDA software used?', answer: 'KiCad & Altium' }]
            })
        });
        const appData = await appRes.json();
        console.log(`Student application submission: HTTP ${appRes.status}`);
        // Student tracks their submission
        const trackRes = await fetch(`${baseUrl}/applications/my`, {
            headers: { 'Authorization': `Bearer ${tokenStudent3}` }
        });
        const trackData = await trackRes.json();
        console.log(`Student tracks my submissions: count=${trackData.applications?.length}, status=${trackData.applications?.[0]?.status}`);
        // Organizer updates status to 'accepted'
        const statusUpdateRes = await fetch(`${baseUrl}/applications/${appData.application._id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenPublisher}` },
            body: JSON.stringify({ status: 'accepted', reviewerNotes: 'Impressive KiCad portfolio.' })
        });
        console.log(`Organizer status update: HTTP ${statusUpdateRes.status}`);
        if (appRes.status === 201 && trackData.applications?.length > 0 && statusUpdateRes.status === 200) {
            console.log('PASS: Club recruitment lifecycle and student tracking confirmed end-to-end.\n');
        }
        else {
            throw new Error('FAIL in Journey 5/6');
        }
        // JOURNEY 7 & 8: Research Publishing, Collaboration Requests, Search & Discovery
        console.log('--- Journey 7 & 8: Research Project, Collaboration Request, & Publication Discovery ---');
        const paper = await ResearchPaper_js_1.ResearchPaper.create({
            title: 'Quantum Key Distribution in Campus Fiber Networks',
            abstract: 'Experimental results on QKD protocols.',
            authors: [{ name: publisher.name, user: publisher._id, institution: publisher.institution }],
            publicationType: 'Journal Paper',
            subject: 'Quantum Computing',
            tags: ['qkd', 'cryptography'],
            institution: publisher.institution,
            visibility: 'public',
            submittedBy: publisher._id
        });
        const searchPaperRes = await fetch(`${baseUrl}/research?search=Quantum+Key`, {
            headers: { 'Authorization': `Bearer ${tokenStudent3}` }
        });
        const searchPaperData = await searchPaperRes.json();
        console.log(`Student searches research paper: found=${searchPaperData.papers?.length > 0}`);
        const collab = await ResearchCollaboration_js_1.ResearchCollaboration.create({
            title: 'Distributed Quantum Mesh Simulation',
            description: 'Simulating entangled node networks.',
            leadResearcher: publisher._id,
            institution: publisher.institution,
            department: 'Computer Science',
            subject: 'Quantum Computing',
            openRoles: [{ roleTitle: 'Quantum Network Developer', vacancies: 1, filled: 0 }],
            status: 'open'
        });
        const applyCollabRes = await fetch(`${baseUrl}/research/collaborations/${collab._id}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenStudent3}` },
            body: JSON.stringify({
                roleSought: 'Quantum Network Developer',
                statement: 'Strong background in Python and network topologies.'
            })
        });
        console.log(`Apply to research collaboration: HTTP ${applyCollabRes.status}`);
        if (searchPaperData.papers?.length > 0 && applyCollabRes.status === 201) {
            console.log('PASS: Research discovery and student collaboration request verified.\n');
        }
        else {
            throw new Error('FAIL in Journey 7/8');
        }
        // JOURNEY 9 & 10: Personalized Feed/Dashboard & Operational Analytics
        console.log('--- Journey 9 & 10: Personalized Dashboard & Operational Analytics ---');
        const feedRes = await fetch(`${baseUrl}/posts/feed/personalized`, {
            headers: { 'Authorization': `Bearer ${tokenSubscriber}` }
        });
        const feedData = await feedRes.json();
        console.log(`Personalized feed retrieval: HTTP ${feedRes.status}, count=${feedData.posts?.length}`);
        const analyticsRes = await fetch(`${baseUrl}/analytics/overview?timeRange=30d`, {
            headers: { 'Authorization': `Bearer ${tokenPublisher}` }
        });
        const analyticsData = await analyticsRes.json();
        console.log(`Operational analytics overview: HTTP ${analyticsRes.status}, scope=${analyticsData.scope}`);
        if (feedRes.status === 200 && analyticsRes.status === 200 && analyticsData.metrics) {
            console.log('PASS: Personalized dashboard and authorized operational analytics verified.\n');
        }
        else {
            throw new Error('FAIL in Journey 9/10');
        }
        // JOURNEY 11: Admin Publisher Verification & Content Moderation
        console.log('--- Journey 11: Admin Verification & Content Moderation ---');
        // Admin toggles verification
        const verifyRes = await fetch(`${baseUrl}/admin/users/${publisher._id}/verify`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` },
            body: JSON.stringify({ isVerified: true })
        });
        console.log(`Admin user verification: HTTP ${verifyRes.status}`);
        // User submits report
        const reportRes = await fetch(`${baseUrl}/admin/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenSubscriber}` },
            body: JSON.stringify({
                targetType: 'post',
                targetId: pubData.post._id,
                reason: 'Duplicate post check'
            })
        });
        const reportData = await reportRes.json();
        // Admin resolves report
        const resolveRes = await fetch(`${baseUrl}/admin/reports/${reportData.report._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenAdmin}` },
            body: JSON.stringify({ status: 'resolved' })
        });
        console.log(`Admin report resolution: HTTP ${resolveRes.status}`);
        if (verifyRes.status === 200 && resolveRes.status === 200) {
            console.log('PASS: Administrator publisher verification and content moderation verified.\n');
        }
        else {
            throw new Error('FAIL in Journey 11');
        }
        // JOURNEY 12: Cross-College Visibility vs Restricted Content Permissions
        console.log('--- Journey 12: Cross-College Visibility & Restricted Content Permissions ---');
        // Create an institution-only restricted research paper
        const restrictedPaper = await ResearchPaper_js_1.ResearchPaper.create({
            title: 'Internal Campus Strategic Roadmap 2030',
            abstract: 'Confidential strategic institutional research.',
            authors: [{ name: publisher.name, user: publisher._id, institution: publisher.institution }],
            publicationType: 'Technical Report',
            subject: 'Policy',
            institution: 'Consortium University A',
            visibility: 'institution-only',
            submittedBy: publisher._id
        });
        // In-institution student accesses restricted paper -> Allowed (200)
        const inInstRes = await fetch(`${baseUrl}/research/${restrictedPaper._id}`, {
            headers: { 'Authorization': `Bearer ${tokenSubscriber}` }
        });
        console.log(`In-institution access to restricted paper: HTTP ${inInstRes.status} (Expected 200)`);
        // External student accesses restricted paper -> Forbidden (403)
        const outInstRes = await fetch(`${baseUrl}/research/${restrictedPaper._id}`, {
            headers: { 'Authorization': `Bearer ${tokenOther}` }
        });
        console.log(`External student access to restricted paper: HTTP ${outInstRes.status} (Expected 403)`);
        if (inInstRes.status === 200 && outInstRes.status === 403) {
            console.log('PASS: Cross-college and institutional privacy boundaries strictly enforced.\n');
        }
        else {
            throw new Error('FAIL in Journey 12: Privacy boundary violated!');
        }
        console.log('================================================================');
        console.log('✅ ALL 12 USER JOURNEYS EXECUTED AND CONFIRMED 100% OPERATIONAL!');
        console.log('================================================================\n');
    }
    catch (error) {
        console.error('E2E TEST FAILURE:', error);
        process.exit(1);
    }
    finally {
        server.close();
        await mongoose_1.default.connection.close();
        process.exit(0);
    }
};
runE2EValidation();
