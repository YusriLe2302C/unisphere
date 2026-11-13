"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
class ApiResponse {
    static success({ res, statusCode = 200, message = 'Success', data, meta }) {
        return res.status(statusCode).json({
            success: true,
            message,
            data: data !== undefined ? data : null,
            ...(meta ? { meta } : {}),
            timestamp: new Date().toISOString()
        });
    }
    static created({ res, message = 'Resource created successfully', data }) {
        return ApiResponse.success({
            res,
            statusCode: 201,
            message,
            data
        });
    }
    static noContent(res) {
        return res.status(204).send();
    }
    static error({ res, statusCode = 500, message = 'An unexpected error occurred', errors }) {
        return res.status(statusCode).json({
            success: false,
            message,
            ...(errors && errors.length > 0 ? { errors } : {}),
            timestamp: new Date().toISOString()
        });
    }
}
exports.ApiResponse = ApiResponse;
