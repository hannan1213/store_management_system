/**
 * API error-handling conventions.
 *
 * Route handlers are wrapped with `createApiHandler`, which converts anything
 * thrown below it into the standard `ApiFailure` envelope:
 *
 *   - ZodError   -> 422 VALIDATION_ERROR (field paths via Zod)
 *   - AppError   -> its own status code
 *   - anything else -> 500 INTERNAL_ERROR, logged, never leaked
 */

import { ZodError } from "zod";
import type { NextRequest } from "next/server";
import { AppError, type ErrorCode } from "@/lib/errors";
import type { ApiErrorMessage, ApiFailure, ApiSuccess } from "@/lib/api";

type Handler<Context> = (request: NextRequest, context: Context) => Promise<Response>;

function jsonError(status: number, error: ApiErrorMessage): Response {
  return Response.json({ ok: false as const, error } satisfies ApiFailure, { status });
}

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true as const, data } satisfies ApiSuccess<T>, init);
}

const GENERIC_FALLBACK: ApiErrorMessage = {
  code: "INTERNAL_ERROR" satisfies ErrorCode,
  message: "Unexpected server error. Nothing was exposed that could leak internals.",
};

function zodIssues(error: ZodError): unknown {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || null,
    message: issue.message,
  }));
}

/**
 * Parse a JSON request body. A malformed body is a client error (400), not an
 * unhandled 500 — this is the only sanctioned way to read JSON in route
 * handlers.
 */
export async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw AppError.badRequest("The request body is not valid JSON.");
  }
}

/**
 * Wrap a route handler so every response follows the `{ ok, data | error }`
 * convention. {@param Context} is typed per route — for dynamic segments pass
 * `{ params: Promise<{ id: string }> }`.
 */
export function createApiHandler<Context = unknown>(handler: Handler<Context>): Handler<Context> {  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonError(422, {
          code: "VALIDATION_ERROR",
          message: "The request payload failed validation.",
          details: zodIssues(error),
        });
      }

      if (error instanceof AppError) {
        return jsonError(error.status, {
          code: error.code,
          message: error.message,
          details: error.details,
        });
      }

      console.error("[api] Unhandled error:", request.method, new URL(request.url).pathname, error);
      return jsonError(500, GENERIC_FALLBACK);
    }
  };
}
