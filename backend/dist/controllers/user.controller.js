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
exports.setAccountStatus = exports.addAchievement = exports.removeProject = exports.addProject = exports.toggleFollow = exports.searchUsers = exports.updateProfile = exports.getProfile = void 0;
const UserService = __importStar(require("../services/user.service.js"));
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
exports.getProfile = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const data = await UserService.getProfile(req.params.id);
    res.json(data);
});
exports.updateProfile = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const user = await UserService.updateProfile(req.user._id.toString(), req.body);
    res.json({ message: 'Profile updated.', user });
});
exports.searchUsers = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { q, institution, role, skill, department, page, limit } = req.query;
    const result = await UserService.searchUsers({ q, institution, role, skill, department, page: Number(page), limit: Number(limit) });
    res.json(result);
});
exports.toggleFollow = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const result = await UserService.toggleFollow(req.user._id.toString(), req.params.id);
    res.json(result);
});
exports.addProject = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const user = await UserService.addProject(req.user._id.toString(), req.body);
    res.status(201).json({ message: 'Project added.', projects: user.projects });
});
exports.removeProject = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const user = await UserService.removeProject(req.user._id.toString(), req.params.projectId);
    res.json({ message: 'Project removed.', projects: user.projects });
});
exports.addAchievement = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const user = await UserService.addAchievement(req.user._id.toString(), req.body);
    res.status(201).json({ message: 'Achievement added.', achievements: user.achievements });
});
exports.setAccountStatus = (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { isActive, disciplinaryStatus } = req.body;
    const user = await UserService.setAccountStatus(req.user._id.toString(), req.params.id, Boolean(isActive), disciplinaryStatus);
    res.json({ message: 'Account status updated.', user });
});
