import type { NextRequest } from "next/server";
import { createApiHandler, jsonOk, readJson } from "@/server/http/route-handler";
import productService from "@/server/services/product-service";
import { productCreateSchema, productQuerySchema } from "@/server/validation/product-schemas";

/** GET /api/products?q=note&page=1&pageSize=20 */
export const GET = createApiHandler(async (request: NextRequest) => {
  const query = productQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  const result = await productService.list(query);
  return jsonOk(result);
});

/** POST /api/products — create a catalogue item. Responds 201. */
export const POST = createApiHandler(async (request: NextRequest) => {
  const input = productCreateSchema.parse(await readJson(request));
  const product = await productService.create({
    ...input,
    stock: input.stock ?? 0,
  });
  return jsonOk({ product }, { status: 201 });
});
