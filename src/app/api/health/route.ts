import { createApiHandler, jsonOk } from "@/server/http/route-handler";
import { env } from "@/lib/env";

export const GET = createApiHandler(async () =>
  jsonOk({
    status: "healthy",
    app: env.APP_NAME,
    environment: env.NODE_ENV,
    repositoryMode: env.REPOSITORY_MODE,
    timestamp: new Date().toISOString(),
  })
);
