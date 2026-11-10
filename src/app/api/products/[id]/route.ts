import type { NextRequest } from "next/server";
import { createApiHandler, jsonOk } from "@/server/http/route-handler";
import productService from "@/server/services/product-service";
import { productIdSchema } from "@/server/validation/product-schemas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** GET /api/products/:id */
export const GET = createApiHandler<RouteContext>(async (_request: NextRequest, context) => {
  const { id } = await context.params;
  const parsedId = productIdSchema.parse(id);
  const product = await productService.getByIdOrSku(parsedId);
  return jsonOk({ product });
});
