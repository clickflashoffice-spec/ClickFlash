/**
 * Typed Error subclass that carries an HTTP status code and a stable
 * machine-readable error code.
 *
 * Replaces the older `(error as any).status = ...` / `.code = ...` pattern
 * that was sprinkled through apiService.ts and pb.ts. Consumers can now
 * narrow with `instanceof ApiError` or check the optional `.response`.
 */
export class ApiError extends Error {
  /** HTTP status code from the failing response, if known. */
  readonly status?: number;
  /** Stable machine-readable error code (e.g. 'AUTHENTICATION_ERROR'). */
  readonly code?: string;
  /** Original Response object, when one was available. */
  readonly response?: Response;
  /** Marks errors that originated from network failures (offline, DNS, etc.). */
  readonly isNetworkError?: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      response?: Response;
      isNetworkError?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.response = options.response;
    this.isNetworkError = options.isNetworkError;
    if (options.cause !== undefined) {
      // ES2022 Error.cause; assigned for tooling that surfaces it.
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

/** Type-safe predicate for the recurring "401-ish" check in API call sites. */
export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** Narrowing predicate to read .status from any thrown value safely. */
export function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof ApiError) return error.status;
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const candidate = (error as { status?: unknown }).status;
    if (typeof candidate === 'number') return candidate;
  }
  return undefined;
}
