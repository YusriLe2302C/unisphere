import mongoose, { Document, Schema, Types } from 'mongoose';
import { UserRole } from './User.js';

export interface IAuditLog extends Document {
  _id: Types.ObjectId; actorId: Types.ObjectId; actorRole: UserRole; action: string; entityType: string; entityId: Types.ObjectId;
  institution?: string; collegeId?: string; ipAddress?: string; userAgent?: string; previousStateSnapshot?: Record<string, any>;
  newStateSnapshot?: Record<string, any>; reason?: string; timestamp: Date; sequence: number; previousHash: string; hash: string;
}

const AuditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, actorRole: { type: String, required: true },
  action: { type: String, required: true, trim: true, index: true }, entityType: { type: String, required: true, trim: true, index: true },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true }, institution: { type: String, index: true }, collegeId: String,
  ipAddress: String, userAgent: String, previousStateSnapshot: Schema.Types.Mixed, newStateSnapshot: Schema.Types.Mixed, reason: String,
  timestamp: { type: Date, default: Date.now, immutable: true, index: true }, sequence: { type: Number, required: true, unique: true },
  previousHash: { type: String, required: true }, hash: { type: String, required: true, unique: true }
}, { timestamps: false, strict: true });
AuditLogSchema.pre('save', function(next) { if (!this.isNew) return next(new Error('Audit entries are immutable')); next(); });
AuditLogSchema.pre('findOneAndUpdate', function() { throw new Error('Audit entries cannot be updated'); });
AuditLogSchema.pre('updateOne', function() { throw new Error('Audit entries cannot be updated'); });
AuditLogSchema.pre('updateMany', function() { throw new Error('Audit entries cannot be updated'); });
AuditLogSchema.pre('findOneAndDelete', function() { throw new Error('Audit entries cannot be deleted'); });
AuditLogSchema.pre('deleteOne', function() { throw new Error('Audit entries cannot be deleted'); });
AuditLogSchema.pre('deleteMany', function() { throw new Error('Audit entries cannot be deleted'); });
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ actorId: 1, timestamp: -1 });
AuditLogSchema.index({ institution: 1, timestamp: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

const AuditHeadSchema = new Schema({ _id: { type: String, default: 'global' }, sequence: { type: Number, default: 0 }, hash: { type: String, default: 'GENESIS' }, lockOwner: String, lockExpiresAt: Date }, { versionKey: false });
export const AuditHead = mongoose.models.AuditHead || mongoose.model('AuditHead', AuditHeadSchema);
