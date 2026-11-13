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
exports.ResearchCollaboration = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CollaborationRoleSchema = new mongoose_1.Schema({
    roleTitle: { type: String, required: true },
    description: { type: String, default: '' },
    vacancies: { type: Number, default: 1 },
    filled: { type: Number, default: 0 }
});
const TeamMemberSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'Co-Investigator' },
    joinedAt: { type: Date, default: Date.now }
}, { _id: false });
const CollaborationApplicationSchema = new mongoose_1.Schema({
    applicant: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roleSought: { type: String, required: true },
    statement: { type: String, required: true },
    relevantSkills: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    portfolioUrl: { type: String, default: '' },
    status: {
        type: String,
        enum: ['pending', 'applied', 'shortlisted', 'accepted', 'declined', 'withdrawn'],
        default: 'pending'
    },
    reviewerNotes: { type: String, default: '' },
    appliedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date }
});
const ResearchCollaborationSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    leadResearcher: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    supervisor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    institution: { type: String, required: true, index: true },
    department: { type: String, default: 'Research & Development' },
    subject: { type: String, required: true, index: true },
    requiredSkills: { type: [String], default: [], index: true },
    openRoles: { type: [CollaborationRoleSchema], default: [] },
    teamMembers: { type: [TeamMemberSchema], default: [] },
    applications: { type: [CollaborationApplicationSchema], default: [] },
    visibility: {
        type: String,
        enum: ['public', 'institution-only'],
        default: 'public',
        index: true
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'completed', 'closed'],
        default: 'open',
        index: true
    },
    tags: { type: [String], default: [] },
    externalLinks: [
        {
            title: { type: String, required: true },
            url: { type: String, required: true }
        }
    ]
}, { timestamps: true });
// Compound text search index
ResearchCollaborationSchema.index({
    title: 'text',
    description: 'text',
    requiredSkills: 'text',
    tags: 'text'
});
exports.ResearchCollaboration = mongoose_1.default.model('ResearchCollaboration', ResearchCollaborationSchema);
