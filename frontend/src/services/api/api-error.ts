import type { ApiErrorPayload } from '../../types/api';

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown[];

  constructor(message: string, status: number, details: unknown[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export async function createApiError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload = {};
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    // Some failures, such as a proxy error, do not return JSON.
  }
  return new ApiError(
    payload.message ?? payload.error ?? `Request failed (${response.status})`,
    response.status,
    Array.isArray(payload.errors) ? payload.errors : [],
  );
}
