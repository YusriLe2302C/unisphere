import mongoose, { Document, Schema, Types } from 'mongoose';

export type FileStorageProvider = 'local' | 's3' | 'gcs';
export type FileAssociatedEntityType =
  | 'post'
  | 'research_paper'
  | 'opportunity'
  | 'application'
  | 'avatar'
  | 'chat_message'
  | 'academic_notice'
  | 'event'
  | 'community_resource'
  | 'profile_image'
  | 'placement_document'
  | 'research_dataset'
  | 'project_document'
  | 'career_question';
export type FileAccessPolicy = 'public' | 'institutional' | 'restricted' | 'private';

export interface IUploadedFile extends Document {
  _id: Types.ObjectId;
  uploaderId: Types.ObjectId;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storageProvider: FileStorageProvider;
  filePath: string;
  fileUrl?: string;
  sha256Hash: string;
  associatedEntityType: FileAssociatedEntityType;
  associatedEntityId?: Types.ObjectId;
  accessPolicy: FileAccessPolicy;
  institution?: string;
  allowedUserIds: Types.ObjectId[];
  isQuarantined: boolean;
  virusScanClean: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UploadedFileSchema = new Schema<IUploadedFile>(
  {
    uploaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
    associatedEntityId: { type: Schema.Types.ObjectId, index: true },
    accessPolicy: {
      type: String,
      enum: ['public', 'institutional', 'restricted', 'private'],
      default: 'public',
      index: true
    },
    institution: { type: String, index: true },
    allowedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isQuarantined: { type: Boolean, default: false },
    virusScanClean: { type: Boolean, default: true }
  },
  { timestamps: true }
);

UploadedFileSchema.index({ sha256Hash: 1 });
UploadedFileSchema.index({ associatedEntityType: 1, associatedEntityId: 1 });
UploadedFileSchema.index({ uploaderId: 1, createdAt: -1 });

export const UploadedFile = mongoose.model<IUploadedFile>(
  'UploadedFile',
  UploadedFileSchema
);
