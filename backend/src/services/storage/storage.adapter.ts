export interface StoredObject {
  key: string;
  size: number;
  sha256: string;
  mimeType: string;
}

export interface StorageAdapter {
  put(key: string, data: Buffer, mimeType: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  list?(): Promise<string[]>;
}
