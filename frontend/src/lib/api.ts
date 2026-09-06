import type { ProblemDetail } from "./types";

/**
 * A failed API call, carrying the backend's RFC 9457 problem document so a form
 * can show per-field messages instead of a generic "something went wrong".
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** True when the session is missing or expired, so the caller should sign in. */
  get isUnauthenticated() {
    return this.status === 401;
  }
}

type QueryValue = string | number | boolean | null | undefined;

/** Drops empty params so `?status=` never reaches the backend as a blank filter. */
export function toQuery(params: Record<string, QueryValue> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Set false on the session probe, so a signed-out visitor is not an error. */
  signal?: AbortSignal;
}

/**
 * Calls the API through the same-origin Next rewrite.
 *
 * `credentials: "include"` is what carries the httpOnly session cookie. No
 * Authorization header is ever set — the token is not readable from here by
 * design.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  const response = await fetch(`/api${path}`, {
    method,
    signal,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload = text ? safeParse(text) : null;

  if (!response.ok) {
    const problem = (payload ?? {}) as ProblemDetail;
    throw new ApiError(
      response.status,
      problem.detail ?? problem.title ?? fallbackMessage(response.status),
      problem.errors ?? {},
    );
  }

  return payload as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function fallbackMessage(status: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have access to this.";
  if (status === 404) return "Not found.";
  if (status >= 500) return "Something went wrong on the server.";
  return "Request failed.";
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
