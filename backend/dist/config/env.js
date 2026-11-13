"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.envConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const validateEnv = () => {
    const nodeEnv = (process.env.NODE_ENV || 'development');
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error('FATAL: JWT_SECRET must be set and at least 32 characters in all environments');
    }
    if (!process.env.MONGODB_URI && nodeEnv === 'production') {
        throw new Error('FATAL: MONGODB_URI must be set in production');
    }
    if (nodeEnv === 'production' && (!process.env.AUDIT_HMAC_SECRET || process.env.AUDIT_HMAC_SECRET.length < 32)) {
        throw new Error('FATAL: AUDIT_HMAC_SECRET must be set to at least 32 characters in production');
    }
    if (process.env.CORS_ORIGIN?.split(',').some(origin => origin.trim() === '*')) {
        throw new Error('FATAL: CORS_ORIGIN must use explicit allowed origins; wildcard origins are not supported');
    }
    if (nodeEnv === 'production' && !process.env.CORS_ORIGIN) {
        throw new Error('FATAL: CORS_ORIGIN must contain explicit allowed origins in production');
    }
    return {
        NODE_ENV: nodeEnv,
        PORT: parseInt(process.env.PORT || '5000', 10),
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/uniglobe_db',
        JWT_SECRET: process.env.JWT_SECRET,
        AUDIT_HMAC_SECRET: process.env.AUDIT_HMAC_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
        CORS_ORIGIN: process.env.CORS_ORIGIN || (nodeEnv === 'production' ? '' : 'http://localhost:5173,http://localhost:3000'),
        EMAIL_VERIFICATION_REQUIRED: process.env.EMAIL_VERIFICATION_REQUIRED === 'true',
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS
    };
};
exports.envConfig = validateEnv();
