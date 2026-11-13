import { StorageAdapter } from './storage.adapter.js';
import { LocalStorageAdapter } from './local.storage.js';

// S3 and Cloudinary adapters implement StorageAdapter; deployments select them here.
export const storage: StorageAdapter = new LocalStorageAdapter();
