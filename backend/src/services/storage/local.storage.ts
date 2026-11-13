import { createHash } from 'crypto';
import { mkdir, readFile, writeFile, unlink, readdir } from 'fs/promises';
import path from 'path';
import { StorageAdapter, StoredObject } from './storage.adapter.js';

const root = path.resolve(process.env.FILE_STORAGE_ROOT || path.join(process.cwd(), 'uploads'));
const resolveKey = (key: string) => {
  const target = path.resolve(root, key);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error('Invalid object key');
  return target;
};

export class LocalStorageAdapter implements StorageAdapter {
  async put(key: string, data: Buffer, mimeType: string): Promise<StoredObject> {
    const full = resolveKey(key); await mkdir(path.dirname(full), { recursive: true }); await writeFile(full, data, { flag: 'wx' });
    return { key, size: data.length, sha256: createHash('sha256').update(data).digest('hex'), mimeType };
  }
  async get(key: string): Promise<Buffer> { return readFile(resolveKey(key)); }
  async delete(key: string): Promise<void> { await unlink(resolveKey(key)).catch((e: any) => { if (e.code !== 'ENOENT') throw e; }); }
  async list(): Promise<string[]> {
    const walk = async (dir: string): Promise<string[]> => {
      let entries: any[];
      try { entries = await readdir(dir, { withFileTypes: true }); } catch (e: any) { if (e.code === 'ENOENT') return []; throw e; }
      const all: string[] = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) all.push(...await walk(full));
        else if (entry.isFile()) all.push(path.relative(root, full).split(path.sep).join('/'));
      }
      return all;
    };
    return walk(root);
  }
}
