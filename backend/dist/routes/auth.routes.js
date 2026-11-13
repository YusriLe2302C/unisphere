"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_js_1 = require("../models/User.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const generateToken = (userId) => {
    const secret = (0, auth_js_1.getJwtSecret)();
    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d');
    return jsonwebtoken_1.default.sign({ id: userId }, secret, { expiresIn });
};
// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, institution, department, graduationYear, headline, bio } = req.body;
        if (!name || !email || !password || !institution) {
            res.status(400).json({ message: 'Name, email, password, and institution are required.' });
            return;
        }
        // Role whitelisting: NEVER allow unprivileged users to register directly as admin
        const allowedRoles = ['student', 'faculty', 'alumni'];
        const chosenRole = (role || 'student').toLowerCase();
        if (!allowedRoles.includes(chosenRole)) {
            res.status(400).json({ message: 'Invalid role. Permitted registration roles are student, faculty, and alumni.' });
            return;
        }
        const existingUser = await User_js_1.User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(400).json({ message: 'An account with this email already exists.' });
            return;
        }
        // Derive domain from email for academic credibility
        const emailDomain = email.includes('@') ? email.split('@')[1].toLowerCase() : '';
        // Institutional verification: Academic domains (.edu, .ac.in, etc.) or university domains auto-verify
        const isAcademic = emailDomain.endsWith('.edu') || emailDomain.endsWith('.ac.in') || emailDomain.includes('univ') || emailDomain.includes('college') || emailDomain.includes('rnsit');
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        const newUser = await User_js_1.User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: chosenRole,
            institution: institution.trim(),
            institutionDomain: emailDomain,
            isVerified: isAcademic, // Verified based on institutional domain
            department: department || 'General Studies',
            graduationYear: graduationYear ? Number(graduationYear) : undefined,
            headline: headline || `${chosenRole.toUpperCase()} at ${institution}`,
            bio: bio || '',
            skills: ['Research', 'Collaboration'],
            interests: ['Academic Networking', 'Innovation']
        });
        const token = generateToken(newUser._id.toString());
        const userJson = newUser.toObject();
        delete userJson.password;
        res.status(201).json({
            message: isAcademic
                ? 'Account created and institution verified successfully.'
                : 'Account created. Institutional verification pending administrative review.',
            token,
            user: userJson
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error during registration.', error: error.message });
    }
});
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required.' });
            return;
        }
        const user = await User_js_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(401).json({ message: 'Invalid email or password.' });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid email or password.' });
            return;
        }
        const token = generateToken(user._id.toString());
        const userJson = user.toObject();
        delete userJson.password;
        res.json({
            message: 'Logged in successfully.',
            token,
            user: userJson
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error during login.', error: error.message });
    }
});
// Demo Login (Instant role switching for local testing & demos)
router.post('/demo-login', async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            res.status(403).json({ message: 'Demo login is strictly disabled in production environments.' });
            return;
        }
        const { role } = req.body; // 'student', 'alumni', 'faculty', 'admin'
        const targetRole = role || 'student';
        // Guard privileged admin switching: require explicit ENABLE_ADMIN_DEMO or dev key
        if (targetRole === 'admin' && process.env.ENABLE_ADMIN_DEMO !== 'true') {
            res.status(403).json({ message: 'Admin demo login requires administrator credentials or ENABLE_ADMIN_DEMO=true.' });
            return;
        }
        const user = await User_js_1.User.findOne({ role: targetRole });
        if (!user) {
            res.status(404).json({ message: `No demo account found for role: ${targetRole}. Please run seed script.` });
            return;
        }
        const token = generateToken(user._id.toString());
        const userJson = user.toObject();
        delete userJson.password;
        res.json({
            message: `Signed in as Demo ${targetRole.toUpperCase()}`,
            token,
            user: userJson
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error during demo login.', error: error.message });
    }
});
// Current Authenticated User
router.get('/me', auth_js_1.authenticate, async (req, res) => {
    res.json({ user: req.user });
});
exports.default = router;
