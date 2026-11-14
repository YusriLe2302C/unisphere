import { createApiError } from './api-error';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const origin = configuredBaseUrl || 'http://localhost:5000';
export const API_BASE_URL = `${origin.replace(/\/$/, '')}/api`;

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue | readonly QueryValue[]>;

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  query?: QueryParams;
  body?: unknown;
  token?: string | null;
  /** Set to false for login/register calls so a rejected credential never clears a valid session. */
  clearSessionOnUnauthorized?: boolean;
}

let unauthorizedHandler: (() => void) | undefined;

export function setUnauthorizedHandler(handler?: () => void): void {
  unauthorizedHandler = handler;
}

/** Applies the same session-expiration behavior to authenticated binary fetches. */
export function handleUnauthorizedResponse(response: Response): void {
  if (response.status === 401) unauthorizedHandler?.();
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(`${API_BASE_URL}/${path.replace(/^\//, '')}`);
  for (const [key, rawValue] of Object.entries(query ?? {})) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value !== null && value !== undefined) url.searchParams.append(key, String(value));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    query,
    body,
    token,
    headers: suppliedHeaders,
    clearSessionOnUnauthorized = true,
    ...requestOptions
  } = options;
  const headers = new Headers(suppliedHeaders);
  if (body !== undefined && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(buildUrl(path, query), {
    ...requestOptions,
    headers,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  if (response.status === 401 && clearSessionOnUnauthorized) handleUnauthorizedResponse(response);
  if (!response.ok) throw await createApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
