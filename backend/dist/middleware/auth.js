"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.optionalAuthenticate = exports.authenticate = exports.getJwtSecret = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_js_1 = require("../models/User.js");
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('FATAL SECURITY ERROR: JWT_SECRET is missing or too short');
    }
    return secret;
};
exports.getJwtSecret = getJwtSecret;
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Authentication required. No token provided.' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const secret = (0, exports.getJwtSecret)();
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const user = await User_js_1.User.findById(decoded.id).select('-password -emailVerificationToken -passwordResetToken');
        if (!user) {
            res.status(401).json({ message: 'User belonging to this token no longer exists.' });
            return;
        }
        // Token revocation via tokenVersion
        if (decoded.ver !== user.tokenVersion) {
            res.status(401).json({ message: 'Token has been revoked. Please log in again.' });
            return;
        }
        // Block suspended / deactivated users
        if (!user.isActive || user.disciplinaryStatus === 'suspended') {
            res.status(403).json({ message: 'Account is suspended. Contact your institution administrator.' });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Invalid or expired authentication token.' });
    }
};
exports.authenticate = authenticate;
const optionalAuthenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const secret = (0, exports.getJwtSecret)();
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            const user = await User_js_1.User.findById(decoded.id).select('-password -emailVerificationToken -passwordResetToken');
            if (user && user.isActive && user.disciplinaryStatus !== 'suspended' && decoded.ver === user.tokenVersion) {
                req.user = user;
            }
        }
    }
    catch {
        // Ignore on optional auth
    }
    next();
};
exports.optionalAuthenticate = optionalAuthenticate;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required.' });
            return;
        }
        if (req.user.role === 'superadmin')
            return next();
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                message: `Forbidden: requires one of [${roles.join(', ')}]. Your role: ${req.user.role}.`
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
