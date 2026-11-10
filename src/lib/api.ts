/**
 * API response envelope types.
 *
 * Every route handler responds with either `{ ok: true, data }` or
 * `{ ok: false, error }` so consumers always know the shape they are reading.
 */

import type { ErrorCode } from "@/lib/errors";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiErrorMessage = {
  code: ErrorCode;
  message: string;
  details?: unknown;
};

export type ApiFailure = {
  ok: false;
  error: ApiErrorMessage;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
