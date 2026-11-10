/**
 * Product repository.
 *
 * The repository layer is the only place that knows where product data lives.
 * It speaks in domain-neutral terms (none of these signatures mention HTTP,
 * request bodies, or route handlers) so services stay storage-agnostic.
 */

import type { Product, ProductCreateInput, ProductListResult, ProductQuery } from "@/lib/types";

export interface ProductRepository {
  list(query: ProductQuery): Promise<ProductListResult>;
  findById(id: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  create(input: ProductCreateInput): Promise<Product>;
}

export type { Product, ProductCreateInput, ProductListResult, ProductQuery };
