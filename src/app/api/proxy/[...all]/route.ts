import { createApiRouteHandler } from "@finstreet/secure-fetch";

const handler = createApiRouteHandler({
  feApiPath: "/api/proxy",
  beBaseUrl: process.env.AUTH_API_BASE_URL!,
});

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as DELETE,
  handler as PATCH,
};
