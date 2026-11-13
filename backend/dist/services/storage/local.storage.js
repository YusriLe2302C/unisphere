"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageAdapter = void 0;
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const root = path_1.default.resolve(process.env.FILE_STORAGE_ROOT || path_1.default.join(process.cwd(), 'uploads'));
const resolveKey = (key) => {
    const target = path_1.default.resolve(root, key);
    if (target !== root && !target.startsWith(`${root}${path_1.default.sep}`))
        throw new Error('Invalid object key');
    return target;
};
class LocalStorageAdapter {
    async put(key, data, mimeType) {
        const full = resolveKey(key);
        await (0, promises_1.mkdir)(path_1.default.dirname(full), { recursive: true });
        await (0, promises_1.writeFile)(full, data, { flag: 'wx' });
        return { key, size: data.length, sha256: (0, crypto_1.createHash)('sha256').update(data).digest('hex'), mimeType };
    }
    async get(key) { return (0, promises_1.readFile)(resolveKey(key)); }
    async delete(key) { await (0, promises_1.unlink)(resolveKey(key)).catch((e) => { if (e.code !== 'ENOENT')
        throw e; }); }
    async list() {
        const walk = async (dir) => {
            let entries;
            try {
                entries = await (0, promises_1.readdir)(dir, { withFileTypes: true });
            }
            catch (e) {
                if (e.code === 'ENOENT')
                    return [];
                throw e;
            }
            const all = [];
            for (const entry of entries) {
                const full = path_1.default.join(dir, entry.name);
                if (entry.isDirectory())
                    all.push(...await walk(full));
                else if (entry.isFile())
                    all.push(path_1.default.relative(root, full).split(path_1.default.sep).join('/'));
            }
            return all;
        };
        return walk(root);
    }
}
exports.LocalStorageAdapter = LocalStorageAdapter;
