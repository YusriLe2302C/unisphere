"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAchievement = exports.removeProject = exports.addProject = exports.setAccountStatus = exports.toggleFollow = exports.searchUsers = exports.updateProfile = exports.getProfile = void 0;
const User_js_1 = require("../models/User.js");
const Post_js_1 = require("../models/Post.js");
const errors_js_1 = require("../utils/errors.js");
const escapeRegex = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
const getProfile = async (userId) => {
    const user = await User_js_1.User.findById(userId)
        .select('-password -emailVerificationToken -passwordResetToken')
        .populate('followers', 'name avatar institution role')
        .populate('following', 'name avatar institution role');
    if (!user)
        throw new errors_js_1.NotFoundError('User not found');
    const postsCount = await Post_js_1.Post.countDocuments({ author: user._id });
    return {
        user,
        stats: {
            postsCount,
            followersCount: user.followers.length,
            followingCount: user.following.length,
            projectsCount: user.projects.length,
            achievementsCount: user.achievements.length
        }
    };
};
exports.getProfile = getProfile;
const SAFE_UPDATE_FIELDS = [
    'name', 'headline', 'bio', 'department', 'graduationYear',
    'skills', 'interests', 'avatar', 'notificationPreferences',
    'privacySettings', 'batch', 'semester', 'section', 'cgpa', 'degree'
];
const updateProfile = async (userId, body) => {
    const updates = {};
    for (const field of SAFE_UPDATE_FIELDS) {
        if (body[field] !== undefined)
            updates[field] = body[field];
    }
    // Prevent sensitive field tampering
    delete updates.role;
    delete updates.responsibilities;
    delete updates.password;
    delete updates.email;
    delete updates.isVerified;
    delete updates.isActive;
    delete updates.tokenVersion;
    delete updates.disciplinaryStatus;
    const user = await User_js_1.User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true })
        .select('-password -emailVerificationToken -passwordResetToken');
    if (!user)
        throw new errors_js_1.NotFoundError('User not found');
    return user;
};
exports.updateProfile = updateProfile;
const searchUsers = async (query) => {
    const filter = { isActive: true };
    if (query.q?.trim()) {
        const escaped = escapeRegex(query.q.trim());
        filter.$or = [
            { name: { $regex: escaped, $options: 'i' } },
            { headline: { $regex: escaped, $options: 'i' } },
            { department: { $regex: escaped, $options: 'i' } }
        ];
    }
    if (query.institution?.trim()) {
        filter.institution = { $regex: escapeRegex(query.institution.trim()), $options: 'i' };
    }
    if (query.role?.trim())
        filter.role = query.role.trim();
    if (query.skill?.trim()) {
        filter.skills = { $in: [new RegExp(escapeRegex(query.skill.trim()), 'i')] };
    }
    if (query.department?.trim()) {
        filter.department = { $regex: escapeRegex(query.department.trim()), $options: 'i' };
    }
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, query.limit || 20);
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
        User_js_1.User.find(filter).select('-password -emailVerificationToken -passwordResetToken').skip(skip).limit(limit).sort({ createdAt: -1 }),
        User_js_1.User.countDocuments(filter)
    ]);
    return { users, total };
};
exports.searchUsers = searchUsers;
const toggleFollow = async (currentUserId, targetUserId) => {
    if (currentUserId === targetUserId)
        throw new errors_js_1.BadRequestError('Cannot follow yourself');
    const [current, target] = await Promise.all([
        User_js_1.User.findById(currentUserId),
        User_js_1.User.findById(targetUserId)
    ]);
    if (!current || !target)
        throw new errors_js_1.NotFoundError('User not found');
    const isFollowing = current.following.some(id => id.toString() === targetUserId);
    if (isFollowing) {
        await Promise.all([
            User_js_1.User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } }),
            User_js_1.User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } })
        ]);
        return { isFollowing: false };
    }
    else {
        await Promise.all([
            User_js_1.User.findByIdAndUpdate(currentUserId, { $addToSet: { following: target._id } }),
            User_js_1.User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: current._id } })
        ]);
        return { isFollowing: true };
    }
};
exports.toggleFollow = toggleFollow;
const setAccountStatus = async (adminId, targetUserId, isActive, disciplinaryStatus) => {
    const admin = await User_js_1.User.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'superadmin' && admin.role !== 'dean' && admin.role !== 'principal')) {
        throw new errors_js_1.ForbiddenError('Insufficient authority');
    }
    const target = await User_js_1.User.findById(targetUserId);
    if (!target)
        throw new errors_js_1.NotFoundError('User not found');
    if (admin.role !== 'superadmin' && admin.institution !== target.institution) {
        throw new errors_js_1.ForbiddenError('Cross-institution account management not permitted');
    }
    const updates = { isActive };
    if (disciplinaryStatus)
        updates.disciplinaryStatus = disciplinaryStatus;
    const updated = await User_js_1.User.findByIdAndUpdate(targetUserId, { $set: updates }, { new: true }).select('-password');
    return updated;
};
exports.setAccountStatus = setAccountStatus;
const addProject = async (userId, project) => {
    if (!project.title || !project.description)
        throw new errors_js_1.BadRequestError('title and description are required');
    const user = await User_js_1.User.findByIdAndUpdate(userId, { $push: { projects: { $each: [project], $position: 0 } } }, { new: true }).select('-password');
    if (!user)
        throw new errors_js_1.NotFoundError('User not found');
    return user;
};
exports.addProject = addProject;
const removeProject = async (userId, projectId) => {
    const user = await User_js_1.User.findById(userId);
    if (!user)
        throw new errors_js_1.NotFoundError('User not found');
    user.projects = user.projects.filter((p) => p._id?.toString() !== projectId);
    await user.save();
    return user;
};
exports.removeProject = removeProject;
const addAchievement = async (userId, achievement) => {
    if (!achievement.title)
        throw new errors_js_1.BadRequestError('title is required');
    const user = await User_js_1.User.findByIdAndUpdate(userId, { $push: { achievements: { $each: [achievement], $position: 0 } } }, { new: true }).select('-password');
    if (!user)
        throw new errors_js_1.NotFoundError('User not found');
    return user;
};
exports.addAchievement = addAchievement;
