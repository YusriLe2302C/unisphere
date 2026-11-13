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
exports.ResearchPaper = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AuthorInfoSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    institution: { type: String, default: '' },
    email: { type: String, default: '' }
}, { _id: false });
const ResearchPaperSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true, index: true },
    abstract: { type: String, required: true },
    authors: { type: [AuthorInfoSchema], required: true },
    authorIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    primaryAuthorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    publicationType: {
        type: String,
        enum: [
            'Journal Paper',
            'Conference Proceeding',
            'Conference Paper',
            'Preprint',
            'Patent',
            'Dataset',
            'Technical Report'
        ],
        default: 'Preprint',
        index: true
    },
    subject: { type: String, required: true, index: true },
    department: { type: String, default: '', index: true },
    collegeId: { type: String, default: '', index: true },
    doi: { type: String, default: undefined, trim: true },
    externalUrl: { type: String, default: '' },
    pdfUrl: { type: String, default: '' },
    fileAttachmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'UploadedFile' },
    datasetFileId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'UploadedFile' },
    datasetUrl: { type: String, default: '' },
    publicationDate: { type: Date, default: Date.now },
    tags: { type: [String], default: [] },
    institution: { type: String, default: '', index: true },
    visibility: {
        type: String,
        enum: ['public', 'institution-only'],
        default: 'public',
        index: true
    },
    submittedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isStudentSubmission: { type: Boolean, default: false },
    lifecycleStatus: {
        type: String,
        enum: [
            'draft',
            'submitted',
            'pending_proctor',
            'pending_guide',
            'approved',
            'rejected',
            'published',
            'archived'
        ],
        default: 'published',
        index: true
    },
    collaborationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ResearchCollaboration' },
    assignedProctorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    assignedProjectGuideId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    assignedProjectGuideIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    revisionRound: { type: Number, default: 1, min: 1 },
    reviewHistory: [{ revisionRound: { type: Number, required: true }, submittedAt: { type: Date, default: Date.now }, submittedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true } }],
    isLegacyPaper: { type: Boolean, default: false },
    citations: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 }
}, { timestamps: true });
// Indexes
ResearchPaperSchema.index({ lifecycleStatus: 1, institution: 1, department: 1 });
ResearchPaperSchema.index({ authorIds: 1, createdAt: -1 });
ResearchPaperSchema.index({ assignedProctorId: 1, lifecycleStatus: 1 }, { sparse: true });
ResearchPaperSchema.index({ assignedProjectGuideId: 1, lifecycleStatus: 1 }, { sparse: true });
ResearchPaperSchema.index({ assignedProjectGuideIds: 1, lifecycleStatus: 1 }, { sparse: true });
ResearchPaperSchema.index({ doi: 1 }, { unique: true, sparse: true });
exports.ResearchPaper = mongoose_1.default.model('ResearchPaper', ResearchPaperSchema);
