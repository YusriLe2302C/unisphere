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
exports.MentorshipBinding = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const MentorshipBindingSchema = new mongoose_1.Schema({
    student: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    faculty: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignmentType: {
        type: String,
        enum: ['proctor', 'project_guide'],
        required: true,
        index: true
    },
    collaborationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'ResearchCollaboration',
        index: true
    },
    department: { type: String, required: true },
    institution: { type: String, required: true },
    collegeId: { type: String },
    status: {
        type: String,
        enum: ['active', 'transferred', 'terminated'],
        default: 'active',
        index: true
    },
    assignedAt: { type: Date, default: Date.now },
    terminatedAt: { type: Date }
}, { timestamps: true });
// Partial Unique Index 1: Exactly 1 active proctor per student
MentorshipBindingSchema.index({ student: 1, assignmentType: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: { assignmentType: 'proctor', status: 'active' }
});
// Project guides are scoped to the student plus optional collaboration; multiple active guides are allowed per scope.
MentorshipBindingSchema.index({ student: 1, collaborationId: 1, assignmentType: 1, faculty: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: { assignmentType: 'project_guide', status: 'active' }
});
MentorshipBindingSchema.index({ faculty: 1, status: 1 });
exports.MentorshipBinding = mongoose_1.default.model('MentorshipBinding', MentorshipBindingSchema);
