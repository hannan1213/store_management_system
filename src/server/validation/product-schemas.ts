/**
 * Validation schemas for the shopping domain.
 *
 * Route handlers parse every input (JSON body, query string, route params)
 * against these schemas before it reaches a service. Inbound coercion is
 * explicit and shared between HTTP and internal callers.
 */

import { z } from "zod";

/** `SKU-001`, `BEV-123` — uppercase prefix + 3 digits. */
export const skuSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{2,5}-\d{3}$/, "SKU must match the pattern PREFIX-123 (e.g. BEV-001)");

export const productCreateSchema = z.object({
  sku: skuSchema,
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  price: z.coerce.number().int().nonnegative().max(10_000_000),
  stock: z.coerce.number().int().nonnegative().default(0),
});

export const productQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .transform((value) => value.toLowerCase()),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .partial({ q: true });

export const productIdSchema = z.string().trim().min(1).max(64);

export type ProductCreate = z.infer<typeof productCreateSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
