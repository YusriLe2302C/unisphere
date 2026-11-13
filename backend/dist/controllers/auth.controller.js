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
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignResponsibilities = exports.assignRole = exports.resetPassword = exports.forgotPassword = exports.verifyEmail = exports.me = exports.logout = exports.login = exports.createAuthority = exports.register = void 0;
const AuthService = __importStar(require("../services/auth.service.js"));
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const User_js_1 = require("../models/User.js");
const audit_service_js_1 = require("../services/audit.service.js");
exports.register = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { user, token } = await AuthService.registerPublic(req.body);
    const userObj = user.toObject();
    delete userObj.password;
    res.status(201).json({ message: 'Account created successfully.', token, user: userObj });
});
exports.createAuthority = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const creatorRole = req.user.role;
    const { user, token } = await AuthService.createAuthorityAccount(creatorRole, req.body);
    await (0, audit_service_js_1.writeAudit)(req.user, 'user.create_authority', 'User', user._id, null, { role: user.role, responsibilities: user.responsibilities, institution: user.institution }, String(req.body.reason || ''), req);
    const userObj = user.toObject();
    delete userObj.password;
    res.status(201).json({ message: 'Authority account created.', token, user: userObj });
});
exports.login = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    const { user, token } = await AuthService.login(email, password);
    const userObj = user.toObject();
    delete userObj.password;
    res.json({ message: 'Logged in successfully.', token, user: userObj });
});
exports.logout = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    await AuthService.logout(req.user._id.toString());
    res.json({ message: 'Logged out successfully. Token revoked.' });
});
exports.me = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    res.json({ user: req.user });
});
exports.verifyEmail = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { token } = req.params;
    await AuthService.verifyEmail(token);
    res.json({ message: 'Email verified successfully.' });
});
exports.forgotPassword = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const resetToken = await AuthService.requestPasswordReset(req.body.email);
    // In production the token is emailed; in dev/test we return it
    const isDev = process.env.NODE_ENV !== 'production';
    res.json({
        message: 'If that email exists, a reset link has been sent.',
        ...(isDev && { resetToken })
    });
});
exports.resetPassword = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { token, newPassword } = req.body;
    await AuthService.resetPassword(token, newPassword);
    res.json({ message: 'Password reset successfully. Please log in again.' });
});
exports.assignRole = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const { role, responsibilities } = req.body;
    const beforeUser = await User_js_1.User.findById(userId);
    const before = beforeUser ? { role: beforeUser.role, responsibilities: beforeUser.responsibilities } : null;
    const user = await AuthService.assignRole(req.user._id.toString(), userId, role, responsibilities);
    await (0, audit_service_js_1.writeAudit)(req.user, 'user.role.assign', 'User', user._id, before, { role: user.role, responsibilities: user.responsibilities }, String(req.body.reason || ''), req);
    res.json({ message: 'Role assigned successfully.', user });
});
exports.assignResponsibilities = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { userId } = req.params;
    const { responsibilities } = req.body;
    const beforeUser = await User_js_1.User.findById(userId);
    const before = beforeUser ? { responsibilities: beforeUser.responsibilities } : null;
    const user = await AuthService.assignResponsibilities(req.user._id.toString(), userId, responsibilities);
    await (0, audit_service_js_1.writeAudit)(req.user, 'user.responsibilities.assign', 'User', user._id, before, { responsibilities: user.responsibilities }, String(req.body.reason || ''), req);
    res.json({ message: 'Responsibilities updated.', user });
});
