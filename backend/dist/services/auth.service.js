"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignResponsibilities = exports.assignRole = exports.resetPassword = exports.requestPasswordReset = exports.verifyEmail = exports.logout = exports.login = exports.createAuthorityAccount = exports.registerPublic = exports.generateToken = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const User_js_1 = require("../models/User.js");
const auth_js_1 = require("../middleware/auth.js");
const errors_js_1 = require("../utils/errors.js");
const permissions_js_1 = require("../utils/permissions.js");
const env_js_1 = require("../config/env.js");
const generateToken = (userId, tokenVersion) => {
    const secret = (0, auth_js_1.getJwtSecret)();
    const expiresIn = (env_js_1.envConfig.JWT_EXPIRES_IN || '7d');
    return jsonwebtoken_1.default.sign({ id: userId, ver: tokenVersion }, secret, { expiresIn });
};
exports.generateToken = generateToken;
const hashPassword = (plain) => bcryptjs_1.default.hash(plain, 12);
const isAcademicDomain = (domain) => domain.endsWith('.edu') ||
    domain.endsWith('.ac.in') ||
    domain.includes('univ') ||
    domain.includes('college') ||
    domain.includes('rnsit');
const registerPublic = async (input) => {
    const { name, email, password, role, institution, department, graduationYear, headline, bio, collegeId, batch, semester, degree } = input;
    if (!name?.trim() || !email?.trim() || !password || !institution?.trim()) {
        throw new errors_js_1.BadRequestError('name, email, password, and institution are required');
    }
    const chosenRole = ((role || 'student').toLowerCase());
    if (!permissions_js_1.PUBLIC_REGISTRATION_ROLES.includes(chosenRole)) {
        throw new errors_js_1.BadRequestError(`Public registration only allows: ${permissions_js_1.PUBLIC_REGISTRATION_ROLES.join(', ')}`);
    }
    if (password.length < 8) {
        throw new errors_js_1.BadRequestError('Password must be at least 8 characters');
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User_js_1.User.findOne({ email: normalizedEmail });
    if (existing)
        throw new errors_js_1.ConflictError('An account with this email already exists');
    const emailDomain = normalizedEmail.includes('@') ? normalizedEmail.split('@')[1] : '';
    const autoVerified = isAcademicDomain(emailDomain);
    let verificationToken;
    let verificationExpires;
    if (env_js_1.envConfig.EMAIL_VERIFICATION_REQUIRED && !autoVerified) {
        verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    }
    const user = await User_js_1.User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: await hashPassword(password),
        role: chosenRole,
        institution: institution.trim(),
        institutionDomain: emailDomain,
        isVerified: autoVerified || !env_js_1.envConfig.EMAIL_VERIFICATION_REQUIRED,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        department: department?.trim() || 'General',
        graduationYear: graduationYear ? Number(graduationYear) : undefined,
        headline: headline?.trim() || `${chosenRole} at ${institution}`,
        bio: bio?.trim() || '',
        collegeId: collegeId?.trim(),
        batch: batch?.trim(),
        semester: semester ? Number(semester) : undefined,
        degree: degree || undefined,
        tokenVersion: 0
    });
    const token = (0, exports.generateToken)(user._id.toString(), user.tokenVersion);
    return { user, token };
};
exports.registerPublic = registerPublic;
const createAuthorityAccount = async (creatorRole, input) => {
    const { name, email, password, role, institution, department, responsibilities } = input;
    if (!name?.trim() || !email?.trim() || !password || !institution?.trim()) {
        throw new errors_js_1.BadRequestError('name, email, password, and institution are required');
    }
    // Only admin/superadmin can create privileged accounts
    if (permissions_js_1.PRIVILEGED_ROLES.includes(role) && creatorRole !== 'admin' && creatorRole !== 'superadmin') {
        throw new errors_js_1.BadRequestError(`Only admins can create '${role}' accounts`);
    }
    if (password.length < 8) {
        throw new errors_js_1.BadRequestError('Password must be at least 8 characters');
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User_js_1.User.findOne({ email: normalizedEmail });
    if (existing)
        throw new errors_js_1.ConflictError('An account with this email already exists');
    const emailDomain = normalizedEmail.includes('@') ? normalizedEmail.split('@')[1] : '';
    const user = await User_js_1.User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: await hashPassword(password),
        role,
        responsibilities: responsibilities || [],
        institution: institution.trim(),
        institutionDomain: emailDomain,
        isVerified: true,
        department: department?.trim() || 'Administration',
        tokenVersion: 0
    });
    const token = (0, exports.generateToken)(user._id.toString(), user.tokenVersion);
    return { user, token };
};
exports.createAuthorityAccount = createAuthorityAccount;
const login = async (email, password) => {
    if (!email || !password)
        throw new errors_js_1.BadRequestError('Email and password are required');
    const user = await User_js_1.User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user)
        throw new errors_js_1.UnauthorizedError('Invalid email or password');
    if (!user.isActive || user.disciplinaryStatus === 'suspended') {
        throw new errors_js_1.UnauthorizedError('Account is suspended. Contact your institution administrator.');
    }
    const isMatch = await bcryptjs_1.default.compare(password, user.password);
    if (!isMatch)
        throw new errors_js_1.UnauthorizedError('Invalid email or password');
    const token = (0, exports.generateToken)(user._id.toString(), user.tokenVersion);
    return { user, token };
};
exports.login = login;
const logout = async (userId) => {
    // Increment tokenVersion to invalidate all existing tokens
    await User_js_1.User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
};
exports.logout = logout;
const verifyEmail = async (token) => {
    const user = await User_js_1.User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() }
    }).select('+emailVerificationToken +emailVerificationExpires');
    if (!user)
        throw new errors_js_1.BadRequestError('Invalid or expired verification token');
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
};
exports.verifyEmail = verifyEmail;
const requestPasswordReset = async (email) => {
    const user = await User_js_1.User.findOne({ email: email.toLowerCase().trim() });
    // Always return success to prevent email enumeration
    if (!user)
        return 'If that email exists, a reset link has been sent';
    const resetToken = crypto_1.default.randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await user.save();
    // In production, send email here via SMTP. Token returned for dev/test.
    return resetToken;
};
exports.requestPasswordReset = requestPasswordReset;
const resetPassword = async (token, newPassword) => {
    if (!newPassword || newPassword.length < 8) {
        throw new errors_js_1.BadRequestError('Password must be at least 8 characters');
    }
    const user = await User_js_1.User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
    }).select('+passwordResetToken +passwordResetExpires');
    if (!user)
        throw new errors_js_1.BadRequestError('Invalid or expired reset token');
    user.password = await hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Revoke all existing tokens
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
};
exports.resetPassword = resetPassword;
const assignRole = async (adminId, targetUserId, newRole, responsibilities) => {
    const admin = await User_js_1.User.findById(adminId);
    if (!admin || !['admin', 'superadmin', 'dean', 'principal'].includes(admin.role)) {
        throw new errors_js_1.BadRequestError('Institution authority required');
    }
    if (permissions_js_1.PRIVILEGED_ROLES.includes(newRole) && admin.role !== 'admin' && admin.role !== 'superadmin') {
        throw new errors_js_1.BadRequestError(`Only admins can assign the '${newRole}' role`);
    }
    const target = await User_js_1.User.findById(targetUserId);
    if (!target)
        throw new errors_js_1.NotFoundError('Target user not found');
    // Prevent cross-institution role assignment (unless superadmin)
    if (admin.role !== 'admin' && admin.role !== 'superadmin' && admin.institution !== target.institution || admin.role === 'admin' && admin.institution !== target.institution) {
        throw new errors_js_1.BadRequestError('Cannot assign roles to users from a different institution');
    }
    const updates = { role: newRole };
    if (responsibilities !== undefined)
        updates.responsibilities = responsibilities;
    const updated = await User_js_1.User.findByIdAndUpdate(targetUserId, { $set: updates }, { new: true }).select('-password');
    return updated;
};
exports.assignRole = assignRole;
const assignResponsibilities = async (adminId, targetUserId, responsibilities) => {
    const admin = await User_js_1.User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin' && admin.role !== 'dean' && admin.role !== 'principal')) {
        throw new errors_js_1.BadRequestError('Insufficient authority to assign responsibilities');
    }
    const target = await User_js_1.User.findById(targetUserId);
    if (!target)
        throw new errors_js_1.NotFoundError('Target user not found');
    if (admin.role !== 'superadmin' && admin.institution !== target.institution) {
        throw new errors_js_1.BadRequestError('Cannot assign responsibilities to users from a different institution');
    }
    const updated = await User_js_1.User.findByIdAndUpdate(targetUserId, { $set: { responsibilities } }, { new: true }).select('-password');
    return updated;
};
exports.assignResponsibilities = assignResponsibilities;
