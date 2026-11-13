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
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_js_1 = require("../middleware/auth.js");
const auth_validator_js_1 = require("../validators/auth.validator.js");
const AuthController = __importStar(require("../controllers/auth.controller.js"));
const router = (0, express_1.Router)();
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again in 15 minutes.' }
});
const strictLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in 1 hour.' }
});
// Public registration — student, faculty, alumni only
router.post('/register', authLimiter, auth_validator_js_1.validateRegister, AuthController.register);
// Login
router.post('/login', authLimiter, auth_validator_js_1.validateLogin, AuthController.login);
// Logout (revokes token via tokenVersion increment)
router.post('/logout', auth_js_1.authenticate, AuthController.logout);
// Current user
router.get('/me', auth_js_1.authenticate, AuthController.me);
// Email verification
router.get('/verify-email/:token', AuthController.verifyEmail);
// Password reset flow
router.post('/forgot-password', strictLimiter, AuthController.forgotPassword);
router.post('/reset-password', strictLimiter, auth_validator_js_1.validatePasswordReset, AuthController.resetPassword);
// Admin: create authority accounts (dean, principal, admin, faculty, etc.)
router.post('/create-authority', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin']), auth_validator_js_1.validateAuthorityCreate, AuthController.createAuthority);
// Admin: assign primary role to existing user
router.put('/users/:userId/role', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), auth_validator_js_1.validateRoleAssignment, AuthController.assignRole);
// Admin/Dean/Principal: assign scoped responsibilities (no new account created)
router.put('/users/:userId/responsibilities', auth_js_1.authenticate, (0, auth_js_1.requireRole)(['admin', 'superadmin', 'dean', 'principal']), AuthController.assignResponsibilities);
// Demo login (dev/test only)
router.post('/demo-login', authLimiter, async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.status(403).json({ message: 'Demo login disabled in production.' });
        return;
    }
    const { User } = await import('../models/User.js');
    const { generateToken } = await import('../services/auth.service.js');
    const { role } = req.body;
    const targetRole = role || 'student';
    const user = await User.findOne({ role: targetRole });
    if (!user) {
        res.status(404).json({ message: `No demo account for role: ${targetRole}. Run seed script.` });
        return;
    }
    const token = generateToken(user._id.toString(), user.tokenVersion);
    const userObj = user.toObject();
    delete userObj.password;
    res.json({ message: `Demo login as ${targetRole}`, token, user: userObj });
});
exports.default = router;
