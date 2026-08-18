import { EndpointConfig } from "@finstreet/secure-fetch";
import {
  ArchiveFinancingCasePathVariablesSchema,
  ArchiveFinancingCasePayloadSchema,
} from "./schema";
import { createMockServerFetchFunction } from "@/shared/backend/createMockServerFetchFunction";

const archiveFinancingCaseConfig = {
  protected: true,
  method: "POST",
  path: "/financial_service_providers/financing_cases/{financingCaseId}/archive",
  pathVariablesSchema: ArchiveFinancingCasePathVariablesSchema,
  payloadSchema: ArchiveFinancingCasePayloadSchema,
} satisfies EndpointConfig;

export const archiveFinancingCase = createMockServerFetchFunction(
  archiveFinancingCaseConfig,
);
