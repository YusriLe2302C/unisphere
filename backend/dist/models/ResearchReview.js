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
exports.ResearchReview = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ResearchReviewSchema = new mongoose_1.Schema({
    paperId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ResearchPaper', required: true, index: true },
    reviewerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewerRole: {
        type: String,
        enum: ['proctor', 'project_guide'],
        required: true,
        index: true
    },
    verdict: {
        type: String,
        enum: ['approved', 'changes_requested', 'rejected'],
        required: true
    },
    comments: { type: String, required: true },
    criteriaScores: {
        novelty: { type: Number, min: 1, max: 10 },
        methodology: { type: Number, min: 1, max: 10 },
        clarity: { type: Number, min: 1, max: 10 },
        ethicalCompliance: { type: Boolean, default: true }
    },
    reviewedAt: { type: Date, default: Date.now },
    revisionRound: { type: Number, default: 1 }
}, { timestamps: true });
// Compound Unique index: prevents double-scoring per revision round by the same reviewer
ResearchReviewSchema.index({ paperId: 1, reviewerId: 1, revisionRound: 1 }, { unique: true });
ResearchReviewSchema.index({ paperId: 1, revisionRound: 1, reviewerRole: 1 });
ResearchReviewSchema.index({ reviewerId: 1, reviewedAt: -1 });
exports.ResearchReview = mongoose_1.default.model('ResearchReview', ResearchReviewSchema);
