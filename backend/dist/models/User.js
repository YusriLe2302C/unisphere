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
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ProjectSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    link: { type: String, default: '' },
    tags: { type: [String], default: [] }
});
const AchievementSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    issuer: { type: String, default: '' },
    year: { type: Number },
    description: { type: String, default: '' }
});
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['student', 'alumni', 'faculty', 'admin'],
        default: 'student',
        required: true
    },
    institution: { type: String, required: true, trim: true },
    institutionDomain: { type: String, default: '', trim: true },
    isVerified: { type: Boolean, default: true },
    avatar: {
        type: String,
        default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    headline: { type: String, default: '' },
    bio: { type: String, default: '' },
    department: { type: String, default: 'Computer Science & Engineering' },
    graduationYear: { type: Number },
    skills: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    projects: { type: [ProjectSchema], default: [] },
    achievements: { type: [AchievementSchema], default: [] },
    followers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    notificationPreferences: {
        inAppAlerts: { type: Boolean, default: true },
        opportunityAlerts: { type: Boolean, default: true },
        eventAlerts: { type: Boolean, default: true },
        researchAlerts: { type: Boolean, default: true },
        communityAlerts: { type: Boolean, default: true }
    }
}, { timestamps: true });
exports.User = mongoose_1.default.model('User', UserSchema);
