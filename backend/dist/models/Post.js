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
const CommentSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true }
}, { timestamps: true });
const EventDetailsSchema = new mongoose_1.Schema({
    venue: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    organizer: { type: String, default: '' },
    capacity: { type: Number, default: 0 },
    registeredAttendees: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    attendedAttendees: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    waitlist: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    isCancelled: { type: Boolean, default: false },
    cancellationReason: { type: String, default: '' },
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
    comments: { type: [CommentSchema], default: [] },
    mediaUrl: { type: String, default: '' },
    deadline: { type: String, default: '' },
    eventDetails: { type: EventDetailsSchema, default: null }
}, { timestamps: true });
exports.Post = mongoose_1.default.model('Post', PostSchema);
