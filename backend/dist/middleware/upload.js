"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageKey = exports.safeExtension = exports.maxUploadBytes = exports.uploadSingle = void 0;
exports.verifySignature = verifySignature;
const multer_1 = __importDefault(require("multer"));
const crypto_1 = require("crypto");
const MAX_BYTES = 15 * 1024 * 1024;
const allowed = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'],
    'text/csv': ['.csv'], 'application/zip': ['.zip'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc']
};
exports.uploadSingle = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 1, fields: 20 },
    fileFilter: (_req, file, cb) => {
        const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
        cb(null, Boolean(allowed[file.mimetype]?.includes(ext)));
    }
}).single('file');
exports.maxUploadBytes = MAX_BYTES;
const safeExtension = (name) => name.slice(name.lastIndexOf('.')).toLowerCase();
exports.safeExtension = safeExtension;
const storageKey = (ext) => `${new Date().toISOString().slice(0, 10)}/${(0, crypto_1.randomUUID)()}${ext}`;
exports.storageKey = storageKey;
function verifySignature(mimeType, data) {
    if (mimeType === 'application/pdf')
        return data.subarray(0, 5).toString() === '%PDF-';
    if (mimeType === 'image/png')
        return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mimeType === 'image/jpeg')
        return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    if (mimeType === 'image/webp')
        return data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
    if (mimeType === 'application/zip' || mimeType.includes('wordprocessingml'))
        return data[0] === 0x50 && data[1] === 0x4b;
    if (mimeType === 'text/csv')
        return !data.subarray(0, 512).includes(0);
    return mimeType === 'application/msword';
}
