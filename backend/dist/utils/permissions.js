"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preventPrivilegeEscalation = exports.requireInstitutionAuthority = exports.requireOwnershipOrRole = exports.requireSameInstitution = exports.requireResponsibility = exports.requireRoles = exports.PUBLIC_REGISTRATION_ROLES = exports.PRIVILEGED_ROLES = void 0;
const errors_js_1 = require("../utils/errors.js");
// Roles that have platform-wide authority
const PLATFORM_ADMIN_ROLES = ['admin', 'superadmin'];
// Roles with institution-scoped authority
const INSTITUTION_AUTHORITY_ROLES = ['dean', 'principal', 'admin', 'superadmin'];
// Privileged roles that cannot be self-assigned via public registration
exports.PRIVILEGED_ROLES = ['dean', 'principal', 'admin'];
// Public registration is limited to these roles
exports.PUBLIC_REGISTRATION_ROLES = ['student', 'faculty', 'alumni'];
const getUser = (req) => {
    return req.user ?? null;
};
const requireRoles = (allowedRoles) => {
    return (req, _res, next) => {
        const user = getUser(req);
        if (!user)
            return next(new errors_js_1.UnauthorizedError('Authentication required'));
        if (user.role === 'superadmin')
            return next();
        if (!allowedRoles.includes(user.role)) {
            return next(new errors_js_1.ForbiddenError(`Action restricted. Required: [${allowedRoles.join(', ')}]. Your role: '${user.role}'`));
        }
        next();
    };
};
exports.requireRoles = requireRoles;
const requireResponsibility = (responsibility) => {
    return (req, _res, next) => {
        const user = getUser(req);
        if (!user)
            return next(new errors_js_1.UnauthorizedError('Authentication required'));
        if (user.role === 'superadmin' || PLATFORM_ADMIN_ROLES.includes(user.role))
            return next();
        if (!user.responsibilities?.includes(responsibility)) {
            return next(new errors_js_1.ForbiddenError(`Requires '${responsibility}' responsibility.`));
        }
        next();
    };
};
exports.requireResponsibility = requireResponsibility;
const requireSameInstitution = (paramName = 'institution') => {
    return (req, _res, next) => {
        const user = getUser(req);
        if (!user)
            return next(new errors_js_1.UnauthorizedError('Authentication required'));
        if (user.role === 'superadmin')
            return next();
        const targetInstitution = req.params[paramName] || req.body[paramName] || req.query[paramName];
        if (!targetInstitution)
            return next();
        const userInstitution = user.institution;
        if (userInstitution.toLowerCase() !== String(targetInstitution).toLowerCase()) {
            return next(new errors_js_1.ForbiddenError('Cross-institution access violation'));
        }
        next();
    };
};
exports.requireSameInstitution = requireSameInstitution;
const requireOwnershipOrRole = (extractResourceOwnerId, fallbackRoles = ['admin', 'superadmin']) => {
    return (req, _res, next) => {
        const user = getUser(req);
        if (!user)
            return next(new errors_js_1.UnauthorizedError('Authentication required'));
        if (user.role === 'superadmin' || fallbackRoles.includes(user.role))
            return next();
        const ownerId = extractResourceOwnerId(req);
        if (!ownerId || ownerId.toString() !== user._id.toString()) {
            return next(new errors_js_1.ForbiddenError('Access denied: You do not own this resource'));
        }
        next();
    };
};
exports.requireOwnershipOrRole = requireOwnershipOrRole;
const requireInstitutionAuthority = () => {
    return (req, _res, next) => {
        const user = getUser(req);
        if (!user)
            return next(new errors_js_1.UnauthorizedError('Authentication required'));
        if (!INSTITUTION_AUTHORITY_ROLES.includes(user.role)) {
            return next(new errors_js_1.ForbiddenError('Requires institution-level authority (dean, principal, or admin)'));
        }
        next();
    };
};
exports.requireInstitutionAuthority = requireInstitutionAuthority;
const preventPrivilegeEscalation = (targetRole) => {
    return (req, _res, next) => {
        const user = getUser(req);
        if (!user)
            return next(new errors_js_1.UnauthorizedError('Authentication required'));
        if (exports.PRIVILEGED_ROLES.includes(targetRole) && !PLATFORM_ADMIN_ROLES.includes(user.role)) {
            return next(new errors_js_1.ForbiddenError(`Only admins can assign the '${targetRole}' role`));
        }
        next();
    };
};
exports.preventPrivilegeEscalation = preventPrivilegeEscalation;
