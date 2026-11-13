"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_js_1 = require("./env.js");
const logger_js_1 = require("../utils/logger.js");
const connectDB = async (customUri, options) => {
    const uri = customUri || env_js_1.envConfig.MONGODB_URI;
    try {
        const conn = await mongoose_1.default.connect(uri, {
            autoIndex: options?.autoIndex !== undefined ? options?.autoIndex : env_js_1.envConfig.NODE_ENV !== 'production',
            serverSelectionTimeoutMS: options?.serverSelectionTimeoutMS || 5000,
            heartbeatFrequencyMS: 2000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000
        });
        logger_js_1.logger.info(`[Database] Successfully connected to MongoDB at ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
        mongoose_1.default.connection.on('error', (err) => {
            logger_js_1.logger.error('[Database] MongoDB connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            logger_js_1.logger.warn('[Database] MongoDB disconnected');
        });
        return conn;
    }
    catch (error) {
        logger_js_1.logger.error('[Database] Fatal MongoDB connection failure:', error);
        if (env_js_1.envConfig.NODE_ENV !== 'test') {
            process.exit(1);
        }
        throw error;
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    try {
        await mongoose_1.default.disconnect();
        logger_js_1.logger.info('[Database] MongoDB disconnected gracefully');
    }
    catch (error) {
        logger_js_1.logger.error('[Database] Error disconnecting MongoDB:', error);
        throw error;
    }
};
exports.disconnectDB = disconnectDB;
