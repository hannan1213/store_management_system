/**
 * Seed script — idempotent, so `npm run db:seed` can be re-run safely.
 *
 * Run with: npx prisma db seed   (wired through prisma.config.ts)
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

try {
  process.loadEnvFile(".env");
} catch {
  // .env is optional when the environment is provided another way.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env first.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const products = [
  { sku: "BEV-001", name: "Mineral Water 1.5L", price: 480, stock: 42 },
  { sku: "BEV-002", name: "Orange Juice 1L", price: 260, stock: 18 },
  { sku: "SNK-001", name: "Potato Chips Salted", price: 120, stock: 4 },
  { sku: "HH-001", name: "Dishwash Liquid 500ml", price: 320, stock: 30 },
  { sku: "STN-001", name: "A4 Notebook 100 pages", price: 150, stock: 60 },
  { sku: "STN-002", name: "Ball Pen Blue (box)", price: 140, stock: 2 },
];

async function main() {
  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: { name: product.name, price: product.price, stock: product.stock },
      create: product,
    });
  }
  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
