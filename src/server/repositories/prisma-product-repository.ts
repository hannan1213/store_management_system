/**
 * PostgreSQL-backed product repository.
 *
 * Prisma specifics stay in this file: services receive plain domain objects
 * and never import the Prisma client.
 */

import type { PrismaClient } from "@/generated/prisma/client";
import type { Product, ProductCreateInput, ProductListResult, ProductQuery } from "@/lib/types";
import type { ProductRepository } from "./product-repository";

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

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        price: item.price,
        stock: item.stock,
        createdAt: item.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    };
  }

  async findById(id: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    return product ? this.toDomain(product) : null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({ where: { sku } });
    return product ? this.toDomain(product) : null;
  }

  async create(input: ProductCreateInput): Promise<Product> {
    const product = await this.prisma.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        price: input.price,
        stock: input.stock,
      },
    });
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
