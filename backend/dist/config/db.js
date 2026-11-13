"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/uniglobe_db';
        await mongoose_1.default.connect(mongoUri);
        console.log(`[Database] Connected to MongoDB at ${mongoUri}`);
    }
    catch (error) {
        console.error('[Database] MongoDB connection error:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
