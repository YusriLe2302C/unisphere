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
exports.Event = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ── Sub-schemas ───────────────────────────────────────────────────────────────
const ScheduleItemSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    speaker: { type: String, default: '' },
    venue: { type: String, default: '' }
}, { _id: true });
const CoordinatorSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    role: { type: String, default: 'Coordinator' },
    contactEmail: { type: String, default: '' }
}, { _id: false });
const SponsorSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    tier: {
        type: String,
        enum: ['title', 'gold', 'silver', 'bronze', 'partner'],
        default: 'partner'
    },
    logoUrl: { type: String, default: '' },
    websiteUrl: { type: String, default: '' }
}, { _id: false });
const EventFileSchema = new mongoose_1.Schema({
    fileId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'UploadedFile' },
    fileType: {
        type: String,
        enum: ['flyer', 'brochure', 'agenda', 'gallery', 'other'],
        required: true
    },
    url: { type: String, required: true },
    originalName: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now }
}, { _id: true });
const EligibilitySchema = new mongoose_1.Schema({
    targetInstitutions: { type: [String], default: [] },
    targetDepartments: { type: [String], default: [] },
    targetBatches: { type: [String], default: [] },
    targetSemesters: { type: [Number], default: [] },
    targetRoles: { type: [String], default: [] },
    minCgpa: { type: Number },
    customCriteria: { type: String, default: '' }
}, { _id: false });
// ── Main schema ───────────────────────────────────────────────────────────────
const EventSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    institution: { type: String, required: true, index: true },
    organizer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
        type: String,
        enum: ['draft', 'pending_review', 'approved', 'rejected', 'published', 'ongoing', 'completed', 'cancelled'],
        default: 'draft',
        index: true
    },
    rejectionReason: { type: String, default: '' },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    publishedAt: { type: Date },
    cancellationReason: { type: String, default: '' },
    cancelledBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    mode: {
        type: String,
        enum: ['in_person', 'online', 'hybrid'],
        default: 'in_person'
    },
    venue: { type: String, default: '' },
    onlineMeetingUrl: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    registrationOpenDate: { type: Date },
    registrationCloseDate: { type: Date },
    audience: {
        type: String,
        enum: ['all', 'students', 'faculty', 'alumni', 'institution_only'],
        default: 'all'
    },
    eligibility: { type: EligibilitySchema, default: () => ({}) },
    rules: { type: [String], default: [] },
    capacity: { type: Number, default: 0, min: 0 },
    allocatedSeats: { type: Number, default: 0, min: 0 },
    registrationLockVersion: { type: Number, default: 0, min: 0 },
    isTeamEvent: { type: Boolean, default: false },
    minTeamSize: { type: Number, default: 1, min: 1 },
    maxTeamSize: { type: Number, default: 1, min: 1 },
    allowWaitlist: { type: Boolean, default: true },
    coordinators: { type: [CoordinatorSchema], default: [] },
    sponsors: { type: [SponsorSchema], default: [] },
    flyerUrl: { type: String, default: '' },
    files: { type: [EventFileSchema], default: [] },
    schedule: { type: [ScheduleItemSchema], default: [] },
    category: { type: String, default: 'General', index: true },
    tags: { type: [String], default: [] },
    idempotencyKeys: { type: [{ key: String, userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }, registrationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'EventRegistration' }, createdAt: { type: Date, default: Date.now } }], default: [], select: false },
    community: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Community', default: null }
}, { timestamps: true });
EventSchema.index({ institution: 1, status: 1, startDate: 1 });
EventSchema.index({ organizer: 1, createdAt: -1 });
EventSchema.index({ startDate: 1, endDate: 1 });
exports.Event = mongoose_1.default.model('Event', EventSchema);
