import { SecureFetchConfig } from "@finstreet/secure-fetch";

export const secureFetchConfig: SecureFetchConfig = {
  feApiPath: "/api/proxy",
  payloadTransformer: "snake",
};
