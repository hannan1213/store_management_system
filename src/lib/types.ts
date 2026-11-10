/**
 * Shared domain types.
 *
 * These types are safe to import from both server and client code —
 * they carry no runtime behaviour and never touch server-only APIs.
 */

export type Product = {
  id: string;
  /** Stock keeping unit, e.g. `SKU-001`. */
  sku: string;
  name: string;
  /** Sale price in minor-currency units? No — whole currency units for readability. */
  price: number;
  /** Units on hand. */
  stock: number;
  createdAt: string;
};

export type ProductQuery = {
  q?: string;
  page: number;
  pageSize: number;
};

export type ProductCreateInput = {
  sku: string;
  name: string;
  price: number;
  stock: number;
};

export type ProductListResult = {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
};
