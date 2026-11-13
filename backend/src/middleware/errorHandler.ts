import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { envConfig } from '../config/env.js';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('[ErrorHandler] Error caught:', err);

  // Operational AppError instances
  if (err instanceof AppError) {
    ApiResponse.error({
      res,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors
    });
    return;
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((e: any) => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    ApiResponse.error({
      res,
      statusCode: 422,
      message: 'Validation failed',
      errors
    });
    return;
  }

  // Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    ApiResponse.error({
      res,
      statusCode: 409,
      message: `Duplicate field value entered for [${fields.join(', ')}]`,
      errors: [
        {
          fields,
          keyValue: err.keyValue
        }
      ]
    });
    return;
  }

  // Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    ApiResponse.error({
      res,
      statusCode: 400,
      message: `Invalid format for field ${err.path}: '${err.value}'`
    });
    return;
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    ApiResponse.error({
      res,
      statusCode: 401,
      message: 'Invalid authorization token'
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    ApiResponse.error({
      res,
      statusCode: 401,
      message: 'Authorization token has expired'
    });
    return;
  }

  // Unhandled / Internal Server Errors
  const isDev = envConfig.NODE_ENV === 'development';
  ApiResponse.error({
    res,
    statusCode: err.status || 500,
    message: isDev ? err.message || 'Internal Server Error' : 'Internal Server Error',
    errors: isDev && err.stack ? [err.stack] : undefined
  });
};

