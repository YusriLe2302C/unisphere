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
exports.UploadedFile = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UploadedFileSchema = new mongoose_1.Schema({
    uploaderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalFileName: { type: String, required: true },
    storedFileName: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true, min: 0 },
    storageProvider: {
        type: String,
        enum: ['local', 's3', 'gcs'],
        default: 'local'
    },
    filePath: { type: String, required: true, select: false },
    fileUrl: { type: String, select: false },
    sha256Hash: { type: String, required: true },
    associatedEntityType: {
        type: String,
        enum: [
            'post',
            'research_paper',
            'opportunity',
            'application',
            'avatar',
            'chat_message',
            'academic_notice',
            'event',
            'community_resource',
            'profile_image',
            'placement_document',
            'research_dataset',
            'project_document',
            'career_question'
        ],
        required: true,
        index: true
    },
    associatedEntityId: { type: mongoose_1.Schema.Types.ObjectId, index: true },
    accessPolicy: {
        type: String,
        enum: ['public', 'institutional', 'restricted', 'private'],
        default: 'public',
        index: true
    },
    institution: { type: String, index: true },
    allowedUserIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    isQuarantined: { type: Boolean, default: false },
    virusScanClean: { type: Boolean, default: true }
}, { timestamps: true });
UploadedFileSchema.index({ sha256Hash: 1 });
UploadedFileSchema.index({ associatedEntityType: 1, associatedEntityId: 1 });
UploadedFileSchema.index({ uploaderId: 1, createdAt: -1 });
exports.UploadedFile = mongoose_1.default.model('UploadedFile', UploadedFileSchema);
