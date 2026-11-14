import { apiRequest } from './client';

export interface FileUploadFields {
  associatedEntityType: string;
  associatedEntityId?: string;
  accessPolicy?: 'public' | 'institutional' | 'restricted' | 'private';
}

/** Uploads the backend's documented `file` multipart field to POST /api/files. */
export function uploadFile<T>(file: File, fields: FileUploadFields, token: string): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  form.append('associatedEntityType', fields.associatedEntityType);
  if (fields.associatedEntityId) form.append('associatedEntityId', fields.associatedEntityId);
  if (fields.accessPolicy) form.append('accessPolicy', fields.accessPolicy);
  return apiRequest<T>('files', { method: 'POST', body: form, token });
}
