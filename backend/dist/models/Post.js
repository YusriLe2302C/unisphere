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
exports.Post = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CommentReplySchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true }
}, { timestamps: true });
const CommentSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    replies: { type: [CommentReplySchema], default: [] }
}, { timestamps: true });
const EventRegistrationSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    registeredAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['registered', 'waitlisted', 'cancelled', 'attended'],
        default: 'registered'
    },
    teamName: { type: String },
    teamMembers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    seatsAllocated: { type: Number, default: 1 },
    attendanceMarked: { type: Boolean, default: false },
    attendedAt: { type: Date },
    ticketCode: { type: String, required: true }
}, { _id: false });
const WaitlistEntrySchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    teamName: { type: String },
    teamMembers: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    seatsRequested: { type: Number, default: 1 },
    waitlistedAt: { type: Date, default: Date.now }
}, { _id: false });
const EventDetailsSchema = new mongoose_1.Schema({
    venue: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    organizer: { type: String, default: '' },
    capacity: { type: Number, default: 0 },
    allocatedSeats: { type: Number, default: 0 },
    registrationDeadline: { type: Date },
    isVirtual: { type: Boolean, default: false },
    virtualMeetingUrl: { type: String, default: '' },
    isTeamEvent: { type: Boolean, default: false },
    minTeamSize: { type: Number, default: 1 },
    maxTeamSize: { type: Number, default: 1 },
    allowWaitlist: { type: Boolean, default: true },
    approvalStatus: {
        type: String,
        enum: ['draft', 'pending_review', 'approved', 'rejected', 'cancelled'],
        default: 'approved'
    },
    publicationStatus: {
        type: String,
        enum: ['unannounced', 'published', 'hidden'],
        default: 'published'
    },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    targetColleges: { type: [String], default: [] },
    targetDepartments: { type: [String], default: [] },
    targetBatches: { type: [String], default: [] },
    registrations: { type: [EventRegistrationSchema], default: [] },
    waitlist: { type: [WaitlistEntrySchema], default: [] },
    isCancelled: { type: Boolean, default: false },
    cancellationReason: { type: String, default: '' },
    // Backward compatibility
    registeredAttendees: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    attendedAttendees: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    sportsDetails: {
        sportType: { type: String, default: '' },
        teams: { type: [String], default: [] },
        matchType: { type: String, default: '' },
        resultScore: { type: String, default: '' }
    }
}, { _id: false });
const PostSchema = new mongoose_1.Schema({
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: '', trim: true },
    content: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: [
            'General',
            'Research',
            'Project',
            'Achievement',
            'Opportunity',
            'Question',
            'Campus Announcement',
            'Hackathon',
            'Official Circular',
            'Event',
            'Cultural Fest',
            'Workshop & Seminar',
            'Sports & Fixtures',
            'Club Activity',
            'Academic Notice',
            'Exam & Deadline'
        ],
        default: 'General',
        index: true
    },
    institution: { type: String, default: '', index: true },
    audience: {
        type: String,
        enum: ['all', 'students', 'faculty', 'alumni'],
        default: 'all',
        index: true
    },
    visibility: {
        type: String,
        enum: ['public', 'institution-only'],
        default: 'public',
        index: true
    },
    tags: { type: [String], default: [] },
    community: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Community', default: null, index: true },
    likes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    bookmarks: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    sharesCount: { type: Number, default: 0 },
    comments: { type: [CommentSchema], default: [] },
    mediaUrl: { type: String, default: '' },
    attachments: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'UploadedFile' }],
    deadline: { type: String, default: '' },
    isPinned: { type: Boolean, default: false },
    isSolved: { type: Boolean, default: false },
    eventDetails: { type: EventDetailsSchema, default: null }
}, { timestamps: true });
// Indexes
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ institution: 1, createdAt: -1 });
PostSchema.index({ community: 1, createdAt: -1 });
PostSchema.index({
    'eventDetails.approvalStatus': 1,
    'eventDetails.publicationStatus': 1,
    'eventDetails.startDate': 1
}, { partialFilterExpression: { category: 'Event' } });
PostSchema.index({ 'eventDetails.registrations.ticketCode': 1 }, { unique: true, sparse: true });
exports.Post = mongoose_1.default.model('Post', PostSchema);
