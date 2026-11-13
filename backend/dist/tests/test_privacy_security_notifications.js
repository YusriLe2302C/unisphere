"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("../app.js");
const db_js_1 = require("../config/db.js");
const User_js_1 = require("../models/User.js");
const Opportunity_js_1 = require("../models/Opportunity.js");
const Application_js_1 = require("../models/Application.js");
const Notification_js_1 = require("../models/Notification.js");
const delivery_service_js_1 = require("../services/delivery.service.js");
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_js_1 = require("../middleware/auth.js");
const runSecurityPassTests = async () => {
    console.log('=== STARTING SECURITY, PRIVACY & NOTIFICATION VERIFICATION SUITE ===');
    await (0, db_js_1.connectDB)();
    const app = (0, app_js_1.createApp)();
    const server = app.listen(5006);
    try {
        const baseUrl = 'http://localhost:5006/api';
        const secret = (0, auth_js_1.getJwtSecret)();
        const ts = Date.now();
        // 1. Personas
        console.log('\n--- 1. Setting Up Authorized & Unauthorized Test Personas ---');
        const studentA = await User_js_1.User.create({
            name: `Student A ${ts}`,
            email: `studenta_${ts}@test.ac.in`,
            password: 'HashedPassword123!',
            role: 'student',
            institution: 'RNS Institute of Technology',
            department: 'Computer Science',
            isVerified: true
        });
        const tokenA = jsonwebtoken_1.default.sign({ id: studentA._id, ver: studentA.tokenVersion, email: studentA.email, role: studentA.role, institution: studentA.institution }, secret, { expiresIn: '1h' });
        const studentB = await User_js_1.User.create({
            name: `Student B ${ts}`,
            email: `studentb_${ts}@test.ac.in`,
            password: 'HashedPassword123!',
            role: 'student',
            institution: 'RV College of Engineering',
            department: 'Electronics',
            isVerified: true
        });
        const tokenB = jsonwebtoken_1.default.sign({ id: studentB._id, ver: studentB.tokenVersion, email: studentB.email, role: studentB.role, institution: studentB.institution }, secret, { expiresIn: '1h' });
        const clubLeader = await User_js_1.User.create({
            name: `Club Leader ${ts}`,
            email: `leader_${ts}@test.ac.in`,
            password: 'HashedPassword123!',
            role: 'student',
            institution: 'RNS Institute of Technology',
            isVerified: true
        });
        const tokenLeader = jsonwebtoken_1.default.sign({ id: clubLeader._id, ver: clubLeader.tokenVersion, email: clubLeader.email, role: clubLeader.role, institution: clubLeader.institution }, secret, { expiresIn: '1h' });
        console.log('PASS: Personas created successfully.');
        // 2. Test Privacy & IDOR Prevention on Application Dossiers
        console.log('\n--- 2. Testing Privacy & IDOR Prevention on Candidate Dossiers ---');
        const opp = await Opportunity_js_1.Opportunity.create({
            title: 'Aerospace Club Core Member',
            organization: 'Aero Club',
            institution: 'RNS Institute of Technology',
            type: 'Club Recruitment',
            description: 'Avionics role',
            postedBy: clubLeader._id
        });
        const appA = await Application_js_1.Application.create({
            applicant: studentA._id,
            opportunity: opp._id,
            roleApplied: 'Avionics Engineer',
            status: 'applied',
            note: 'Confidential private statement: I have high security clearance and GPA 3.9'
        });
        // Student B attempts to read candidate dossiers for Aerospace Club
        const unauthorizedReadRes = await fetch(`${baseUrl}/applications/target/${opp._id}`, {
            headers: { 'Authorization': `Bearer ${tokenB}` }
        });
        console.log(`Unauthorized dossier access: HTTP ${unauthorizedReadRes.status} (Expected 403)`);
        if (unauthorizedReadRes.status === 403) {
            console.log('PASS: Unauthorized candidate dossier reading blocked with 403.');
        }
        else {
            throw new Error(`FAIL: Unauthorized student accessed applicant dossiers! HTTP ${unauthorizedReadRes.status}`);
        }
        // Student B attempts to export candidate dossier data
        const unauthorizedExportRes = await fetch(`${baseUrl}/applications/target/${opp._id}/export`, {
            headers: { 'Authorization': `Bearer ${tokenB}` }
        });
        console.log(`Unauthorized data export attempt: HTTP ${unauthorizedExportRes.status} (Expected 403)`);
        if (unauthorizedExportRes.status === 403) {
            console.log('PASS: Unauthorized data export blocked with 403.');
        }
        else {
            throw new Error(`FAIL: Unauthorized student exported applicant records! HTTP ${unauthorizedExportRes.status}`);
        }
        // Authorized Club Leader exports data
        const authorizedExportRes = await fetch(`${baseUrl}/applications/target/${opp._id}/export`, {
            headers: { 'Authorization': `Bearer ${tokenLeader}` }
        });
        const exportData = await authorizedExportRes.json();
        console.log(`Authorized export status: HTTP ${authorizedExportRes.status}, records: ${exportData.recordCount}`);
        if (authorizedExportRes.status === 200 && exportData.recordCount === 1) {
            // Verify minimum necessary data (no passwords, no secret tokens)
            const record = exportData.records[0];
            if (record.candidateName && !record.password && !record.token) {
                console.log('PASS: Data export sanitized to minimum necessary information without credential leakage.');
            }
            else {
                throw new Error('FAIL: Data export leaked sensitive credentials!');
            }
        }
        else {
            throw new Error('FAIL: Authorized export failed.');
        }
        // Student B attempts to modify Student A's application status
        const unauthorizedStatusRes = await fetch(`${baseUrl}/applications/${appA._id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenB}`
            },
            body: JSON.stringify({ status: 'accepted' })
        });
        console.log(`Unauthorized status change attempt: HTTP ${unauthorizedStatusRes.status} (Expected 403)`);
        if (unauthorizedStatusRes.status === 403) {
            console.log('PASS: Unauthorized candidate status mutation strictly blocked.');
        }
        else {
            throw new Error('FAIL: Unauthorized status change allowed!');
        }
        // 3. Test Notification Preferences & Muting
        console.log('\n--- 3. Testing Notification Preferences & Delivery Filtering ---');
        // Disable opportunity alerts for Student A
        await User_js_1.User.findByIdAndUpdate(studentA._id, {
            $set: {
                'notificationPreferences.inAppAlerts': true,
                'notificationPreferences.opportunityAlerts': false // Muted
            }
        });
        // Deliver an opportunity alert
        const deliveredCount = await delivery_service_js_1.DeliveryService.deliverContentNotification({
            specificRecipients: [studentA._id, studentB._id],
            senderId: clubLeader._id,
            type: 'opportunity',
            entityId: opp._id.toString(),
            message: 'New open position in Aero Club'
        });
        console.log(`Delivered alerts count: ${deliveredCount} (Expected 1 because studentA muted opportunityAlerts)`);
        if (deliveredCount === 1) {
            const studentANotif = await Notification_js_1.Notification.findOne({ recipient: studentA._id, entityId: opp._id.toString() });
            const studentBNotif = await Notification_js_1.Notification.findOne({ recipient: studentB._id, entityId: opp._id.toString() });
            if (!studentANotif && studentBNotif) {
                console.log('PASS: User category preferences strictly respected. Muted user received 0 alerts.');
            }
            else {
                throw new Error('FAIL: Notification preferences were violated!');
            }
        }
        else {
            throw new Error(`FAIL: Expected 1 delivered alert, got ${deliveredCount}`);
        }
        // 4. Test Notification Deduplication (24-hour guard)
        console.log('\n--- 4. Testing Notification Deduplication ---');
        const repeatDeliveredCount = await delivery_service_js_1.DeliveryService.deliverContentNotification({
            specificRecipients: [studentB._id],
            senderId: clubLeader._id,
            type: 'opportunity',
            entityId: opp._id.toString(),
            message: 'New open position in Aero Club (Repeat notification)'
        });
        console.log(`Repeat delivery count: ${repeatDeliveredCount} (Expected 0 due to 24-hr deduplication)`);
        if (repeatDeliveredCount === 0) {
            console.log('PASS: Duplicate alert delivery prevented by 24-hour entityId deduplication.');
        }
        else {
            throw new Error('FAIL: Duplicate notification was delivered!');
        }
        // 5. Test Notification Privacy / Safe Disclosure
        console.log('\n--- 5. Verifying Safe Notification Messaging (No Sensitive Data Leaks) ---');
        const notifs = await Notification_js_1.Notification.find({ recipient: studentB._id });
        for (const n of notifs) {
            if (n.message.includes('Password') || n.message.includes('token') || n.message.includes('GPA') || n.message.includes('clearance')) {
                throw new Error(`FAIL: Notification exposed confidential details: ${n.message}`);
            }
        }
        console.log('PASS: All notification previews contain safe descriptive titles without private disclosures.');
        console.log('\n=== ALL PRIVACY, SECURITY & NOTIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
    }
    catch (error) {
        console.error('VERIFICATION ERROR:', error);
        process.exit(1);
    }
    finally {
        server.close();
        await mongoose_1.default.connection.close();
        process.exit(0);
    }
};
runSecurityPassTests();
