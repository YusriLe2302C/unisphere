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
exports.AuditHead = exports.AuditLog = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AuditLogSchema = new mongoose_1.Schema({
    actorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, actorRole: { type: String, required: true },
    action: { type: String, required: true, trim: true, index: true }, entityType: { type: String, required: true, trim: true, index: true },
    entityId: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true }, institution: { type: String, index: true }, collegeId: String,
    ipAddress: String, userAgent: String, previousStateSnapshot: mongoose_1.Schema.Types.Mixed, newStateSnapshot: mongoose_1.Schema.Types.Mixed, reason: String,
    timestamp: { type: Date, default: Date.now, immutable: true, index: true }, sequence: { type: Number, required: true, unique: true },
    previousHash: { type: String, required: true }, hash: { type: String, required: true, unique: true }
}, { timestamps: false, strict: true });
AuditLogSchema.pre('save', function (next) { if (!this.isNew)
    return next(new Error('Audit entries are immutable')); next(); });
AuditLogSchema.pre('findOneAndUpdate', function () { throw new Error('Audit entries cannot be updated'); });
AuditLogSchema.pre('updateOne', function () { throw new Error('Audit entries cannot be updated'); });
AuditLogSchema.pre('updateMany', function () { throw new Error('Audit entries cannot be updated'); });
AuditLogSchema.pre('findOneAndDelete', function () { throw new Error('Audit entries cannot be deleted'); });
AuditLogSchema.pre('deleteOne', function () { throw new Error('Audit entries cannot be deleted'); });
AuditLogSchema.pre('deleteMany', function () { throw new Error('Audit entries cannot be deleted'); });
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ actorId: 1, timestamp: -1 });
AuditLogSchema.index({ institution: 1, timestamp: -1 });
exports.AuditLog = mongoose_1.default.models.AuditLog || mongoose_1.default.model('AuditLog', AuditLogSchema);
const AuditHeadSchema = new mongoose_1.Schema({ _id: { type: String, default: 'global' }, sequence: { type: Number, default: 0 }, hash: { type: String, default: 'GENESIS' }, lockOwner: String, lockExpiresAt: Date }, { versionKey: false });
exports.AuditHead = mongoose_1.default.models.AuditHead || mongoose_1.default.model('AuditHead', AuditHeadSchema);
