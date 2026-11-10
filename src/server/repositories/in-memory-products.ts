/**
 * In-memory product repository.
 *
 * Seed data keeps the template useful with zero infrastructure. Replace this
 * implementation with a database-backed one behind the same interface —
 * services and route handlers will not change.
 */

import { AppError } from "@/lib/errors";
import type { Product, ProductCreateInput, ProductListResult, ProductQuery } from "@/lib/types";
import type { ProductRepository } from "./product-repository";

const SEED_PRODUCTS: Product[] = [
  {
    id: "p_beverage_001",
    sku: "BEV-001",
    name: "Mineral Water 1.5L",
    price: 480,
    stock: 42,
    createdAt: "2026-01-05T08:00:00.000Z",
  },
  {
    id: "p_beverage_002",
    sku: "BEV-002",
    name: "Orange Juice 1L",
    price: 260,
    stock: 18,
    createdAt: "2026-01-05T08:05:00.000Z",
  },
  {
    id: "p_snack_001",
    sku: "SNK-001",
    name: "Potato Chips Salted",
    price: 120,
    stock: 4,
    createdAt: "2026-01-06T09:30:00.000Z",
  },
  {
    id: "p_household_001",
    sku: "HH-001",
    name: "Dishwash Liquid 500ml",
    price: 320,
    stock: 30,
    createdAt: "2026-01-07T10:00:00.000Z",
  },
  {
    id: "p_stationery_001",
    sku: "STN-001",
    name: "A4 Notebook 100 pages",
    price: 150,
    stock: 60,
    createdAt: "2026-01-08T11:00:00.000Z",
  },
  {
    id: "p_stationery_002",
    sku: "STN-002",
    name: "Ball Pen Blue (box)",
    price: 140,
    stock: 2,
    createdAt: "2026-01-08T11:30:00.000Z",
  },
];

export class InMemoryProductRepository implements ProductRepository {
  private readonly products: Product[];

  constructor(products: Product[] = SEED_PRODUCTS) {
    this.products = [...products];
  }

  async list(query: ProductQuery): Promise<ProductListResult> {
    const { q, page, pageSize } = query;
    const needle = q?.toLowerCase();

    const filtered = this.products.filter(
      (p) =>
        !needle || p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle)
    );

    const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    const start = (page - 1) * pageSize;

    return {
      items: sorted.slice(start, start + pageSize),
      page,
      pageSize,
      total: filtered.length,
    };
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.find((p) => p.id === id) ?? null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.products.find((p) => p.sku === sku.toUpperCase()) ?? null;
  }

  async create(input: ProductCreateInput): Promise<Product> {
    if (await this.findBySku(input.sku)) {
      throw AppError.conflict("SKU already in use by another product", {
        field: "sku",
        value: input.sku,
      });
    }

    const product: Product = {
      id: `p_${crypto.randomUUID()}`,
      sku: input.sku,
      name: input.name,
      price: input.price,
      stock: input.stock,
      createdAt: new Date().toISOString(),
    };
    this.products.push(product);
    return product;
  }
}
