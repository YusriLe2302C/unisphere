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
}, { _id: false });
const AchievementSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    issuer: { type: String, default: '' },
    year: { type: Number },
    description: { type: String, default: '' }
}, { _id: false });
const ALL_PRIMARY_ROLES = ['student', 'alumni', 'faculty', 'dean', 'principal', 'admin'];
const ALL_RESPONSIBILITIES = [
    'proctor', 'project_guide', 'rnd_staff', 'placement_coordinator', 'club_advisor', 'timetable_coordinator'
];
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: [...ALL_PRIMARY_ROLES, 'superadmin'],
        default: 'student',
        required: true
    },
    responsibilities: {
        type: [String],
        enum: ALL_RESPONSIBILITIES,
        default: []
    },
    institution: { type: String, required: true, trim: true, index: true },
    collegeId: { type: String, trim: true, index: true },
    institutionDomain: { type: String, default: '', trim: true },
    isVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0 },
    lastSeenAt: { type: Date },
    avatar: {
        type: String,
        default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    headline: { type: String, default: '' },
    bio: { type: String, default: '' },
    department: { type: String, default: 'General', index: true },
    degree: {
        type: String,
        enum: ['btech', 'mtech', 'bca', 'mca', 'bsc', 'msc', 'phd', 'diploma']
    },
    batch: { type: String },
    semester: { type: Number, min: 1, max: 12 },
    section: { type: String },
    cgpa: { type: Number, min: 0, max: 10 },
    graduationYear: { type: Number },
    disciplinaryStatus: {
        type: String,
        enum: ['good_standing', 'warning', 'probation', 'suspended'],
        default: 'good_standing',
        index: true
    },
    isPlacementEligible: { type: Boolean, default: false, index: true },
    alumniProfile: { company: String, designation: String, industry: String, yearsExperience: { type: Number, min: 0 }, mentorshipInterests: { type: [String], default: [] } },
    privacySettings: {
        showEmail: { type: Boolean, default: false },
        showPhone: { type: Boolean, default: false },
        showAcademicDetails: { type: Boolean, default: true },
        allowDirectMessages: { type: Boolean, default: true }
    },
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
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });
UserSchema.index({ institution: 1, department: 1, role: 1 });
UserSchema.index({ collegeId: 1, department: 1, role: 1 }, { sparse: true });
UserSchema.index({ collegeId: 1, isPlacementEligible: 1, cgpa: -1 }, { partialFilterExpression: { role: 'student' } });
exports.User = mongoose_1.default.model('User', UserSchema);
