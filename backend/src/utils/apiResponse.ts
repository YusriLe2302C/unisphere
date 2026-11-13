import { Response } from 'express';

export interface ApiResponseOptions<T> {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
    [key: string]: any;
  };
}

export class ApiResponse {
  static success<T>({
    res,
    statusCode = 200,
    message = 'Success',
    data,
    meta
  }: ApiResponseOptions<T>): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data: data !== undefined ? data : null,
      ...(meta ? { meta } : {}),
      timestamp: new Date().toISOString()
    });
  }

  static created<T>({
    res,
    message = 'Resource created successfully',
    data
  }: ApiResponseOptions<T>): Response {
    return ApiResponse.success({
      res,
      statusCode: 201,
      message,
      data
    });
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static error({
    res,
    statusCode = 500,
    message = 'An unexpected error occurred',
    errors
  }: {
    res: Response;
    statusCode?: number;
    message?: string;
    errors?: any[];
  }): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors && errors.length > 0 ? { errors } : {}),
      timestamp: new Date().toISOString()
    });
  }
}

