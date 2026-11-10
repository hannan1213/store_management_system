/**
 * PostgreSQL-backed product repository.
 *
 * Prisma specifics stay in this file: services receive plain domain objects
 * and never import the Prisma client. Connection failures are translated into
 * a typed `AppError` so a stopped database produces a 503, not a raw crash.
 */

import type { PrismaClient } from "@/generated/prisma/client";
import { AppError } from "@/lib/errors";
import type { Product, ProductCreateInput, ProductListResult, ProductQuery } from "@/lib/types";
import type { ProductRepository } from "./product-repository";

/** Prisma error codes that mean "the database cannot be reached right now". */
const UNAVAILABLE_CODES = new Set([
  "P1000", // authentication failed
  "P1001", // can't reach database server
  "P1002", // database server timed out
  "P1008", // operation timed out
  "P1010", // user access denied
  "P1017", // server closed the connection
  "P2024", // pool timeout
]);

function isUnavailable(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === "string" && UNAVAILABLE_CODES.has(code)) return true;

  const message = error instanceof Error ? error.message : "";
  return /can't reach database server|ECONNREFUSED|ECONNRESET|connection refused|server closed the connection|terminating connection/i.test(
    message,
  );
}

/**
 * Run a database operation, converting connection problems into a 503. Other
 * errors pass through untouched so genuine bugs still surface as 500s.
 */
async function run<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isUnavailable(error)) {
      throw AppError.unavailable(
        "The database is unavailable. Start it with `npm run db:up`, then try again.",
      );
    }
    throw error;
  }
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: ProductQuery): Promise<ProductListResult> {
    const { q, page, pageSize } = query;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [items, total] = await run(() =>
      Promise.all([
        this.prisma.product.findMany({
          where,
          orderBy: { name: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.product.count({ where }),
      ]),
    );

    return {
      items: items.map((item) => this.toDomain(item)),
      page,
      pageSize,
      total,
    };
  }

  async findById(id: string): Promise<Product | null> {
    const product = await run(() => this.prisma.product.findUnique({ where: { id } }));
    return product ? this.toDomain(product) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const product = await run(() => this.prisma.product.findUnique({ where: { sku } }));
    return product ? this.toDomain(product) : null;
  }

  async create(input: ProductCreateInput): Promise<Product> {
    const product = await run(() =>
      this.prisma.product.create({
        data: {
          sku: input.sku,
          name: input.name,
          price: input.price,
          stock: input.stock,
        },
      }),
    );
    return this.toDomain(product);
  }

  private toDomain(product: {
    id: string;
    sku: string;
    name: string;
    price: number;
    stock: number;
    createdAt: Date;
  }): Product {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock: product.stock,
      createdAt: product.createdAt.toISOString(),
    };
  }
}
