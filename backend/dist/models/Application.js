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
exports.Application = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ApplicationAnswerSchema = new mongoose_1.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true }
}, { _id: false });
const ApplicationSchema = new mongoose_1.Schema({
    applicant: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    opportunity: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Opportunity', required: true, index: true },
    roleApplied: { type: String, required: true },
    answers: { type: [ApplicationAnswerSchema], default: [] },
    status: {
        type: String,
        enum: ['applied', 'under_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn'],
        default: 'applied',
        index: true
    },
    note: { type: String, default: '' },
    resumeLink: { type: String, default: '' },
    resumeFileId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'UploadedFile' },
    reviewerNotes: { type: String, default: '' },
    idempotencyKey: { type: String, trim: true },
    interviewRounds: [{ name: { type: String, required: true }, scheduledAt: Date, status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' }, notes: String }],
    selectionStatus: { type: String, enum: ['pending', 'selected', 'not_selected', 'waitlisted'], default: 'pending' },
    offerStatus: { type: String, enum: ['not_issued', 'issued', 'accepted', 'declined', 'expired'], default: 'not_issued' },
    history: [{ status: String, changedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }, note: String, changedAt: { type: Date, default: Date.now } }]
}, { timestamps: true });
// Compound index to prevent duplicate submissions from the same user for the same opportunity
ApplicationSchema.index({ applicant: 1, opportunity: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
exports.Application = mongoose_1.default.model('Application', ApplicationSchema);
