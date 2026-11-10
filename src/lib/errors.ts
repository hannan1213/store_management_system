/**
 * Application error types.
 *
 * Services throw `AppError`; the HTTP layer (see `src/server/http/route-handler.ts`)
 * maps these onto the API error envelope. Never throw raw `Error` across layers.
 */

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    options?: { details?: unknown; cause?: unknown }
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = options?.details;
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError("BAD_REQUEST", 400, message, { details });
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError("VALIDATION_ERROR", 422, message, { details });
  }

  static notFound(what: string): AppError {
    return new AppError("NOT_FOUND", 404, `${what} not found`);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError("CONFLICT", 409, message, { details });
  }

  static internal(message = "Unexpected server error"): AppError {
    return new AppError("INTERNAL_ERROR", 500, message);
  }
}
