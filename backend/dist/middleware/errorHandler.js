"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_js_1 = require("../utils/errors.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const logger_js_1 = require("../utils/logger.js");
const env_js_1 = require("../config/env.js");
const errorHandler = (err, _req, res, _next) => {
    logger_js_1.logger.error('[ErrorHandler] Error caught:', err);
    // Operational AppError instances
    if (err instanceof errors_js_1.AppError) {
        apiResponse_js_1.ApiResponse.error({
            res,
            statusCode: err.statusCode,
            message: err.message,
            errors: err.errors
        });
        return;
    }
    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors || {}).map((e) => ({
            field: e.path,
            message: e.message,
            value: e.value
        }));
        apiResponse_js_1.ApiResponse.error({
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
        apiResponse_js_1.ApiResponse.error({
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
        apiResponse_js_1.ApiResponse.error({
            res,
            statusCode: 400,
            message: `Invalid format for field ${err.path}: '${err.value}'`
        });
        return;
    }
    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
        apiResponse_js_1.ApiResponse.error({
            res,
            statusCode: 401,
            message: 'Invalid authorization token'
        });
        return;
    }
    if (err.name === 'TokenExpiredError') {
        apiResponse_js_1.ApiResponse.error({
            res,
            statusCode: 401,
            message: 'Authorization token has expired'
        });
        return;
    }
    // Unhandled / Internal Server Errors
    const isDev = env_js_1.envConfig.NODE_ENV === 'development';
    apiResponse_js_1.ApiResponse.error({
        res,
        statusCode: err.status || 500,
        message: isDev ? err.message || 'Internal Server Error' : 'Internal Server Error',
        errors: isDev && err.stack ? [err.stack] : undefined
    });
};
exports.errorHandler = errorHandler;
