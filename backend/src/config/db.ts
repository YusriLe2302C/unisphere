import mongoose from 'mongoose';
import { envConfig } from './env.js';
import { logger } from '../utils/logger.js';

interface ConnectionOptions {
  autoIndex?: boolean;
  serverSelectionTimeoutMS?: number;
}

export const connectDB = async (customUri?: string, options?: ConnectionOptions): Promise<typeof mongoose> => {
  const uri = customUri || envConfig.MONGODB_URI;

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: options?.autoIndex !== undefined ? options?.autoIndex : envConfig.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: options?.serverSelectionTimeoutMS || 5000,
      heartbeatFrequencyMS: 2000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000
    });

    logger.info(`[Database] Successfully connected to MongoDB at ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

    mongoose.connection.on('error', (err) => {
      logger.error('[Database] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('[Database] MongoDB disconnected');
    });

    return conn;
  } catch (error) {
    logger.error('[Database] Fatal MongoDB connection failure:', error);
    if (envConfig.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('[Database] MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('[Database] Error disconnecting MongoDB:', error);
    throw error;
  }
};
