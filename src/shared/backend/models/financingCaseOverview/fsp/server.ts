import { EndpointConfig } from "@finstreet/secure-fetch";
import { createMockServerFetchFunction } from "@/shared/backend/createMockServerFetchFunction";
import {
  GetFspFinancingCaseOverviewResponseSchema,
  GetFspFinancingCaseOverviewPathVariablesSchema,
  GetFspFinancingCaseOverviewResponseType,
} from "./schema";

const getFspFinancingCaseOverviewConfig = {
  protected: true,
  method: "GET",
  path: "/financial_service_providers/financing_cases/{financingCaseId}/overview",
  pathVariablesSchema: GetFspFinancingCaseOverviewPathVariablesSchema,
  resultSchema: GetFspFinancingCaseOverviewResponseSchema,
} satisfies EndpointConfig;

export const getFspFinancingCaseOverview = createMockServerFetchFunction(
  getFspFinancingCaseOverviewConfig,
);

export type { GetFspFinancingCaseOverviewResponseType };
