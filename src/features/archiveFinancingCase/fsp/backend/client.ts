import { EndpointConfig } from "@finstreet/secure-fetch";
import { GetArchiveOptionsResponseSchema } from "./schema";
import { createMockClientFetchFunction } from "@/shared/backend/createMockClientFetchFunction";

const getArchiveOptionsConfig = {
  protected: true,
  method: "GET",
  path: "/financial_service_providers/financing_cases/archival/options",
  resultSchema: GetArchiveOptionsResponseSchema,
} satisfies EndpointConfig;

export const getArchiveOptions = createMockClientFetchFunction(
  getArchiveOptionsConfig,
);
