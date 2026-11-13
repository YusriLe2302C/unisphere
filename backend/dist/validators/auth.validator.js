"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRoleAssignment = exports.validateAuthorityCreate = exports.validatePasswordReset = exports.validateLogin = exports.validateRegister = void 0;
const errors_js_1 = require("../utils/errors.js");
const ALL_RESPONSIBILITIES = [
    'proctor', 'project_guide', 'rnd_staff', 'placement_coordinator', 'club_advisor', 'timetable_coordinator'
];
const ALL_PRIMARY_ROLES = ['student', 'alumni', 'faculty', 'dean', 'principal', 'admin'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateRegister = (req, _res, next) => {
    try {
        const { name, email, password, institution } = req.body;
        if (!name?.trim())
            return next(new errors_js_1.BadRequestError('name is required'));
        if (!email?.trim() || !EMAIL_RE.test(email))
            return next(new errors_js_1.BadRequestError('Valid email is required'));
        if (!password || password.length < 8)
            return next(new errors_js_1.BadRequestError('Password must be at least 8 characters'));
        if (!institution?.trim())
            return next(new errors_js_1.BadRequestError('institution is required'));
        next();
    }
    catch (e) {
        next(e);
    }
};
exports.validateRegister = validateRegister;
const validateLogin = (req, _res, next) => {
    try {
        const { email, password } = req.body;
        if (!email?.trim() || !EMAIL_RE.test(email))
            return next(new errors_js_1.BadRequestError('Valid email is required'));
        if (!password)
            return next(new errors_js_1.BadRequestError('password is required'));
        next();
    }
    catch (e) {
        next(e);
    }
};
exports.validateLogin = validateLogin;
const validatePasswordReset = (req, _res, next) => {
    try {
        const { token, newPassword } = req.body;
        if (!token?.trim())
            return next(new errors_js_1.BadRequestError('Reset token is required'));
        if (!newPassword || newPassword.length < 8)
            return next(new errors_js_1.BadRequestError('New password must be at least 8 characters'));
        next();
    }
    catch (e) {
        next(e);
    }
};
exports.validatePasswordReset = validatePasswordReset;
const validateAuthorityCreate = (req, _res, next) => {
    try {
        const { name, email, password, institution, role, responsibilities } = req.body;
        if (!name?.trim())
            return next(new errors_js_1.BadRequestError('name is required'));
        if (!email?.trim() || !EMAIL_RE.test(email))
            return next(new errors_js_1.BadRequestError('Valid email is required'));
        if (!password || password.length < 8)
            return next(new errors_js_1.BadRequestError('Password must be at least 8 characters'));
        if (!institution?.trim())
            return next(new errors_js_1.BadRequestError('institution is required'));
        if (!role || !ALL_PRIMARY_ROLES.includes(role)) {
            return next(new errors_js_1.BadRequestError(`role must be one of: ${ALL_PRIMARY_ROLES.join(', ')}`));
        }
        if (responsibilities !== undefined) {
            if (!Array.isArray(responsibilities))
                return next(new errors_js_1.BadRequestError('responsibilities must be an array'));
            const invalid = responsibilities.filter(r => !ALL_RESPONSIBILITIES.includes(r));
            if (invalid.length)
                return next(new errors_js_1.BadRequestError(`Invalid responsibilities: ${invalid.join(', ')}`));
        }
        next();
    }
    catch (e) {
        next(e);
    }
};
exports.validateAuthorityCreate = validateAuthorityCreate;
const validateRoleAssignment = (req, _res, next) => {
    try {
        const { role, responsibilities } = req.body;
        if (!role || !ALL_PRIMARY_ROLES.includes(role)) {
            return next(new errors_js_1.BadRequestError(`role must be one of: ${ALL_PRIMARY_ROLES.join(', ')}`));
        }
        if (responsibilities !== undefined) {
            if (!Array.isArray(responsibilities))
                return next(new errors_js_1.BadRequestError('responsibilities must be an array'));
            const invalid = responsibilities.filter(r => !ALL_RESPONSIBILITIES.includes(r));
            if (invalid.length)
                return next(new errors_js_1.BadRequestError(`Invalid responsibilities: ${invalid.join(', ')}`));
        }
        next();
    }
    catch (e) {
        next(e);
    }
};
exports.validateRoleAssignment = validateRoleAssignment;
