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
exports.CareerQuestion = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CareerAnswerSchema = new mongoose_1.Schema({
    responder: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    isVerifiedFaculty: { type: Boolean, default: false },
    isEndorsed: { type: Boolean, default: false }
}, { timestamps: true });
const CareerQuestionSchema = new mongoose_1.Schema({
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedMentor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    visibility: {
        type: String,
        enum: ['public', 'private_to_mentor'],
        default: 'public',
        index: true
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    attachmentIds: { type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'UploadedFile' }], select: false, default: [] },
    followUps: [{ author: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }, content: { type: String, required: true }, createdAt: { type: Date, default: Date.now } }],
    tags: { type: [String], default: [] },
    targetDepartments: { type: [String], default: [] },
    institution: { type: String, index: true },
    answers: { type: [CareerAnswerSchema], default: [] },
    isClosed: { type: Boolean, default: false, index: true },
    flaggedForModeration: { type: Boolean, default: false, index: true }
}, { timestamps: true });
CareerQuestionSchema.index({ visibility: 1, targetDepartments: 1, createdAt: -1 });
CareerQuestionSchema.index({ assignedMentor: 1, visibility: 1, isClosed: 1 });
CareerQuestionSchema.index({ author: 1, createdAt: -1 });
exports.CareerQuestion = mongoose_1.default.model('CareerQuestion', CareerQuestionSchema);
