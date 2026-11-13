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
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production!');
        }
        return 'super_secret_uniglobe_hackathon_jwt_key_2026';
    }
    return secret;
};
exports.getJwtSecret = getJwtSecret;
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Authentication required. No token provided.' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const secret = (0, exports.getJwtSecret)();
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const user = await User_js_1.User.findById(decoded.id).select('-password');
        if (!user) {
            res.status(401).json({ message: 'User belonging to this token no longer exists.' });
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
/**
 * Optional authentication: Attaches req.user if a valid token is provided,
 * but allows the request to continue unauthenticated if no token is present.
 */
const optionalAuthenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const secret = (0, exports.getJwtSecret)();
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            const user = await User_js_1.User.findById(decoded.id).select('-password');
            if (user) {
                req.user = user;
            }
        }
    }
    catch {
        // Ignore invalid token on optional auth
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
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                message: `Forbidden: Action requires one of [${roles.join(', ')}] roles. Your role is ${req.user.role}.`
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
