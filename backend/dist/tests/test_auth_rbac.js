"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * UNIVERSE Auth, RBAC & User Management Test Suite
 * Tests: all roles, registration flows, invalid tokens, suspended accounts,
 *        privilege escalation, cross-institution access, unauthorized access.
 */
const app_js_1 = require("../app.js");
const db_js_1 = require("../config/db.js");
const User_js_1 = require("../models/User.js");
const mongoose_1 = __importDefault(require("mongoose"));
const BASE = 'http://localhost:5099/api';
let server;
let adminToken = '';
let studentToken = '';
let facultyToken = '';
let alumniToken = '';
let deanToken = '';
let principalToken = '';
let studentId = '';
let facultyId = '';
let studentEmail = '';
let facultyEmail = '';
let facultyPassword = 'Password123!';
const post = async (path, body, token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
};
const put = async (path, body, token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
};
const get = async (path, token) => {
    const headers = {};
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { headers });
    return { status: res.status, body: await res.json() };
};
const assert = (condition, msg) => {
    if (!condition)
        throw new Error(`FAIL: ${msg}`);
    console.log(`  PASS: ${msg}`);
};
const ts = () => Date.now();
const runTests = async () => {
    console.log('\n=== UNIVERSE AUTH & RBAC TEST SUITE ===\n');
    await (0, db_js_1.connectDB)();
    const app = (0, app_js_1.createApp)();
    server = app.listen(5099);
    await new Promise(r => setTimeout(r, 500));
    try {
        // ── A. REGISTRATION ──────────────────────────────────────────────────────
        console.log('── A. Registration ──');
        const sReg = await post('/auth/register', {
            name: 'Test Student', email: `student_${ts()}@rnsit.ac.in`,
            password: 'Password123!', institution: 'RNSIT', role: 'student', department: 'CSE'
        });
        assert(sReg.status === 201, 'Student registration returns 201');
        assert(!!sReg.body.token, 'Student registration returns token');
        studentToken = sReg.body.token;
        studentId = sReg.body.user._id;
        studentEmail = sReg.body.user.email;
        const fReg = await post('/auth/register', {
            name: 'Test Faculty', email: `faculty_${ts()}@rnsit.ac.in`,
            password: facultyPassword, institution: 'RNSIT', role: 'faculty'
        });
        assert(fReg.status === 201, 'Faculty registration returns 201');
        facultyToken = fReg.body.token;
        facultyId = fReg.body.user._id;
        facultyEmail = fReg.body.user.email;
        const aReg = await post('/auth/register', {
            name: 'Test Alumni', email: `alumni_${ts()}@gmail.com`,
            password: 'Password123!', institution: 'RNSIT', role: 'alumni'
        });
        assert(aReg.status === 201, 'Alumni registration returns 201');
        alumniToken = aReg.body.token;
        // Privilege escalation via public registration — blocked
        const deanAttempt = await post('/auth/register', {
            name: 'Fake Dean', email: `fakedean_${ts()}@rnsit.ac.in`,
            password: 'Password123!', institution: 'RNSIT', role: 'dean'
        });
        assert(deanAttempt.status === 400, 'Public registration blocks dean role');
        const principalAttempt = await post('/auth/register', {
            name: 'Fake Principal', email: `fakeprincipal_${ts()}@rnsit.ac.in`,
            password: 'Password123!', institution: 'RNSIT', role: 'principal'
        });
        assert(principalAttempt.status === 400, 'Public registration blocks principal role');
        const adminAttempt = await post('/auth/register', {
            name: 'Fake Admin', email: `fakeadmin_${ts()}@rnsit.ac.in`,
            password: 'Password123!', institution: 'RNSIT', role: 'admin'
        });
        assert(adminAttempt.status === 400, 'Public registration blocks admin role');
        // Duplicate email prevention
        const dupReg = await post('/auth/register', {
            name: 'Dup', email: studentEmail, password: 'Password123!', institution: 'RNSIT'
        });
        assert(dupReg.status === 409, 'Duplicate email returns 409');
        // Weak password rejected
        const weakPwd = await post('/auth/register', {
            name: 'Weak', email: `weak_${ts()}@rnsit.ac.in`, password: '123', institution: 'RNSIT'
        });
        assert(weakPwd.status === 400, 'Weak password rejected');
        // Missing required fields
        const missingFields = await post('/auth/register', { name: 'No Email', password: 'Password123!', institution: 'RNSIT' });
        assert(missingFields.status === 400, 'Missing email rejected');
        // ── B. ADMIN SETUP ───────────────────────────────────────────────────────
        console.log('\n── B. Admin Setup ──');
        const adminUser = await User_js_1.User.create({
            name: 'Platform Admin', email: `admin_${ts()}@rnsit.ac.in`,
            password: '$2a$12$placeholder', role: 'admin', institution: 'RNSIT',
            institutionDomain: 'rnsit.ac.in', isVerified: true, tokenVersion: 0
        });
        const { generateToken } = await import('../services/auth.service.js');
        adminToken = generateToken(adminUser._id.toString(), 0);
        assert(!!adminToken, 'Admin token generated');
        const deanCreate = await post('/auth/create-authority', {
            name: 'Test Dean', email: `dean_${ts()}@rnsit.ac.in`,
            password: 'Password123!', institution: 'RNSIT', role: 'dean'
        }, adminToken);
        assert(deanCreate.status === 201, 'Admin creates dean account');
        deanToken = deanCreate.body.token;
        const principalCreate = await post('/auth/create-authority', {
            name: 'Test Principal', email: `principal_${ts()}@rnsit.ac.in`,
            password: 'Password123!', institution: 'RNSIT', role: 'principal'
        }, adminToken);
        assert(principalCreate.status === 201, 'Admin creates principal account');
        principalToken = principalCreate.body.token;
        // Student cannot create authority accounts
        const studentCreateAuthority = await post('/auth/create-authority', {
            name: 'Sneaky Dean', email: `sneaky_${ts()}@rnsit.ac.in`,
            password: 'Password123!', institution: 'RNSIT', role: 'dean'
        }, studentToken);
        assert(studentCreateAuthority.status === 403, 'Student blocked from creating authority accounts');
        // Admin assigns role to existing user
        const roleAssign = await put(`/auth/users/${studentId}/role`, { role: 'faculty' }, adminToken);
        assert(roleAssign.status === 200, 'Admin assigns role to user');
        assert(roleAssign.body.user.role === 'faculty', 'Role updated to faculty');
        // Revert role back to student
        await put(`/auth/users/${studentId}/role`, { role: 'student' }, adminToken);
        // Admin assigns responsibilities (no new account)
        const respAssign = await put(`/auth/users/${facultyId}/responsibilities`, {
            responsibilities: ['proctor', 'project_guide']
        }, adminToken);
        assert(respAssign.status === 200, 'Admin assigns responsibilities without new account');
        assert(respAssign.body.user.responsibilities.includes('proctor'), 'Proctor responsibility assigned');
        // Student cannot assign roles
        const studentRoleAssign = await put(`/auth/users/${facultyId}/role`, { role: 'admin' }, studentToken);
        assert(studentRoleAssign.status === 403, 'Student blocked from assigning roles');
        // ── C. LOGIN & TOKEN ─────────────────────────────────────────────────────
        console.log('\n── C. Login & Token ──');
        const loginRes = await post('/auth/login', { email: studentEmail, password: 'Password123!' });
        assert(loginRes.status === 200, 'Login returns 200');
        assert(!!loginRes.body.token, 'Login returns token');
        const badLogin = await post('/auth/login', { email: studentEmail, password: 'wrongpassword' });
        assert(badLogin.status === 401, 'Wrong password returns 401');
        const noUser = await post('/auth/login', { email: 'nobody@nowhere.com', password: 'Password123!' });
        assert(noUser.status === 401, 'Non-existent email returns 401');
        const meRes = await get('/auth/me', loginRes.body.token);
        assert(meRes.status === 200, '/me returns 200 with valid token');
        const meNoToken = await get('/auth/me');
        assert(meNoToken.status === 401, '/me returns 401 without token');
        const meInvalid = await get('/auth/me', 'Bearer invalid.token.here');
        assert(meInvalid.status === 401, '/me returns 401 with invalid token');
        // ── D. LOGOUT & TOKEN REVOCATION ─────────────────────────────────────────
        console.log('\n── D. Logout & Token Revocation ──');
        // Use a fresh login for logout test — keep facultyToken intact
        const logoutLogin = await post('/auth/login', { email: facultyEmail, password: facultyPassword });
        const preLogoutToken = logoutLogin.body.token;
        const logoutRes = await post('/auth/logout', {}, preLogoutToken);
        assert(logoutRes.status === 200, 'Logout returns 200');
        const revokedMe = await get('/auth/me', preLogoutToken);
        assert(revokedMe.status === 401, 'Revoked token rejected after logout');
        // facultyToken (from registration) is now also revoked since tokenVersion incremented
        // Re-login faculty to get a fresh token for later RBAC tests
        const facRelogin = await post('/auth/login', { email: facultyEmail, password: facultyPassword });
        facultyToken = facRelogin.body.token;
        // ── E. PASSWORD RESET ────────────────────────────────────────────────────
        console.log('\n── E. Password Reset ──');
        const forgotRes = await post('/auth/forgot-password', { email: studentEmail });
        assert(forgotRes.status === 200, 'Forgot password returns 200');
        const resetToken = forgotRes.body.resetToken;
        assert(!!resetToken, 'Reset token returned in dev mode');
        const resetRes = await post('/auth/reset-password', { token: resetToken, newPassword: 'NewPassword456!' });
        assert(resetRes.status === 200, 'Password reset succeeds');
        // Old token revoked after reset
        const oldTokenAfterReset = await get('/auth/me', studentToken);
        assert(oldTokenAfterReset.status === 401, 'Old token revoked after password reset');
        // Login with new password
        const newLoginRes = await post('/auth/login', { email: studentEmail, password: 'NewPassword456!' });
        assert(newLoginRes.status === 200, 'Login with new password succeeds');
        studentToken = newLoginRes.body.token;
        const badReset = await post('/auth/reset-password', { token: 'invalidtoken', newPassword: 'NewPassword456!' });
        assert(badReset.status === 400, 'Invalid reset token returns 400');
        const unknownForgot = await post('/auth/forgot-password', { email: 'nobody@nowhere.com' });
        assert(unknownForgot.status === 200, 'Unknown email forgot-password returns 200 (no enumeration)');
        // ── F. SUSPENDED ACCOUNT ─────────────────────────────────────────────────
        console.log('\n── F. Suspended Account ──');
        const suspendRes = await put(`/users/${studentId}/status`, {
            isActive: false, disciplinaryStatus: 'suspended'
        }, adminToken);
        assert(suspendRes.status === 200, 'Admin suspends student account');
        const suspendedMe = await get('/auth/me', studentToken);
        assert(suspendedMe.status === 403, 'Suspended user blocked from /me');
        const suspendedLogin = await post('/auth/login', { email: studentEmail, password: 'NewPassword456!' });
        assert(suspendedLogin.status === 401, 'Suspended user cannot login');
        const reactivate = await put(`/users/${studentId}/status`, {
            isActive: true, disciplinaryStatus: 'good_standing'
        }, adminToken);
        assert(reactivate.status === 200, 'Admin reactivates student account');
        // ── G. RBAC ──────────────────────────────────────────────────────────────
        console.log('\n── G. RBAC ──');
        // Force reconnect and wait for it to stabilise
        for (let i = 0; i < 5; i++) {
            try {
                await User_js_1.User.findOne({}).lean();
                break;
            }
            catch {
                await new Promise(r => setTimeout(r, 300));
            }
        }
        await new Promise(r => setTimeout(r, 200));
        const adminStats = await get('/admin/stats', adminToken);
        assert(adminStats.status === 200, 'Admin can access /admin/stats');
        const studentStats = await get('/admin/stats', studentToken);
        assert(studentStats.status === 403, 'Student blocked from /admin/stats');
        const facultyStats = await get('/admin/stats', facultyToken);
        assert(facultyStats.status === 403, 'Faculty blocked from /admin/stats');
        const deanUsers = await get('/admin/users', deanToken);
        assert(deanUsers.status === 200, 'Dean can access /admin/users');
        const principalUsers = await get('/admin/users', principalToken);
        assert(principalUsers.status === 200, 'Principal can access /admin/users');
        const alumniUsers = await get('/admin/users', alumniToken);
        assert(alumniUsers.status === 403, 'Alumni blocked from /admin/users');
        const studentSuspend = await put(`/users/${facultyId}/status`, { isActive: false }, studentToken);
        assert(studentSuspend.status === 403, 'Student blocked from suspending users');
        const facultyAssignRole = await put(`/auth/users/${studentId}/role`, { role: 'admin' }, facultyToken);
        assert(facultyAssignRole.status === 403, 'Faculty blocked from assigning roles');
        // ── H. CROSS-INSTITUTION PROTECTION ──────────────────────────────────────
        console.log('\n── H. Cross-Institution Protection ──');
        const otherInstUser = await User_js_1.User.create({
            name: 'Other Inst User', email: `other_${ts()}@other.ac.in`,
            password: '$2a$12$placeholder', role: 'student', institution: 'Other University',
            institutionDomain: 'other.ac.in', isVerified: true, tokenVersion: 0
        });
        const crossInstSuspend = await put(`/users/${otherInstUser._id}/status`, {
            isActive: false, disciplinaryStatus: 'suspended'
        }, deanToken);
        assert(crossInstSuspend.status === 403, 'Dean blocked from cross-institution account management');
        const crossInstRole = await put(`/auth/users/${otherInstUser._id}/role`, { role: 'faculty' }, adminToken);
        assert(crossInstRole.status === 400, 'Admin blocked from cross-institution role assignment');
        // ── I. PROFILE MANAGEMENT ────────────────────────────────────────────────
        console.log('\n── I. Profile Management ──');
        const profileRes = await get(`/users/${studentId}`);
        assert(profileRes.status === 200, 'Get user profile returns 200');
        assert(!!profileRes.body.user, 'Profile response contains user');
        assert(!!profileRes.body.stats, 'Profile response contains stats');
        const updateRes = await put('/users/profile/me', { headline: 'Updated Headline', skills: ['TypeScript', 'Node.js'] }, studentToken);
        assert(updateRes.status === 200, 'Profile update returns 200');
        assert(updateRes.body.user.headline === 'Updated Headline', 'Headline updated');
        // Cannot escalate via profile update
        await put('/users/profile/me', { role: 'admin', isVerified: true, tokenVersion: 999 }, studentToken);
        const checkProfile = await get(`/users/${studentId}`);
        assert(checkProfile.body.user.role === 'student', 'Role not changed via profile update');
        const addProject = await post('/users/projects', {
            title: 'Test Project', description: 'A test project', tags: ['TypeScript']
        }, studentToken);
        assert(addProject.status === 201, 'Add project returns 201');
        const addAchievement = await post('/users/achievements', {
            title: 'Best Coder Award', issuer: 'RNSIT', year: 2024
        }, studentToken);
        assert(addAchievement.status === 201, 'Add achievement returns 201');
        const searchRes = await get('/users?q=Test&institution=RNSIT');
        assert(searchRes.status === 200, 'User search returns 200');
        assert(Array.isArray(searchRes.body.users), 'Search returns users array');
        const followRes = await post(`/users/${facultyId}/follow`, {}, studentToken);
        assert(followRes.status === 200, 'Follow returns 200');
        const unfollowRes = await post(`/users/${facultyId}/follow`, {}, studentToken);
        assert(unfollowRes.status === 200, 'Unfollow returns 200');
        const selfFollow = await post(`/users/${studentId}/follow`, {}, studentToken);
        assert(selfFollow.status === 400, 'Self-follow returns 400');
        // ── J. RATE LIMITING ─────────────────────────────────────────────────────
        console.log('\n── J. Rate Limiting ──');
        let rateLimited = false;
        for (let i = 0; i < 7; i++) {
            const r = await post('/auth/forgot-password', { email: 'test@test.com' });
            if (r.status === 429) {
                rateLimited = true;
                break;
            }
        }
        assert(rateLimited, 'Rate limiter triggers on forgot-password after threshold');
        // ── K. EMAIL VERIFICATION ────────────────────────────────────────────────
        console.log('\n── K. Email Verification ──');
        const badVerify = await get('/auth/verify-email/invalidtoken123');
        assert(badVerify.status === 400, 'Invalid email verification token returns 400');
        console.log('\n=== ALL TESTS PASSED ===\n');
    }
    finally {
        await User_js_1.User.deleteMany({ email: { $regex: /@rnsit\.ac\.in$|@gmail\.com$|@other\.ac\.in$/ } });
        server.close();
        await mongoose_1.default.disconnect();
    }
};
runTests().catch(err => {
    console.error('\nTEST SUITE FAILED:', err.message);
    if (server)
        server.close();
    mongoose_1.default.disconnect().finally(() => process.exit(1));
});
