/**
 * Product service.
 *
 * The service layer owns business rules and is the only layer route handlers
 * and server components should talk to. It can throw `AppError`; it never
 * throws repository internals, raw `Error`, or HTTP constructs.
 */

import { AppError } from "@/lib/errors";
import type { Product, ProductCreateInput, ProductListResult, ProductQuery } from "@/lib/types";
import { env } from "@/lib/env";
import { getPrisma } from "@/server/db/prisma";
import { InMemoryProductRepository } from "@/server/repositories/in-memory-products";
import { PrismaProductRepository } from "@/server/repositories/prisma-product-repository";
import type { ProductRepository } from "@/server/repositories/product-repository";

function buildProductRepository(): ProductRepository {
  switch (env.REPOSITORY_MODE) {
    case "memory":
      return new InMemoryProductRepository();
    case "database":
      return new PrismaProductRepository(getPrisma());
  }
}

export class ProductService {
  constructor(private readonly products: ProductRepository) {}

  async list(query: ProductQuery): Promise<ProductListResult> {
    return this.products.list(query);
  }

  /**
   * Look up a product by its opaque id or its SKU (user-facing identifier).
   * Throws `AppError.notFound` when neither matches.
   */
  async getByIdOrSku(identifier: string): Promise<Product> {
    const byId = await this.products.findById(identifier);
    if (byId) return byId;

    const bySku = await this.products.findBySku(identifier.trim().toUpperCase());
    if (bySku) return bySku;

    throw AppError.notFound("Product");
  }

  async create(input: ProductCreateInput): Promise<Product> {
    const existing = await this.products.findBySku(input.sku);
    if (existing) {
      throw AppError.conflict("SKU already in use by another product", {
        field: "sku",
        value: input.sku,
      });
    }
    return this.products.create(input);
  }
}

const productService = new ProductService(buildProductRepository());
export default productService;
