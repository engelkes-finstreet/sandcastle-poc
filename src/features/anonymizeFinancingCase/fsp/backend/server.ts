import { EndpointConfig } from "@finstreet/secure-fetch";
import { createMockServerFetchFunction } from "@/shared/backend/createMockServerFetchFunction";
import {
  AnonymizeFinancingCasePathVariablesSchema,
  AnonymizeFinancingCaseResponseSchema,
} from "@/features/anonymizeFinancingCase/fsp/backend/schema";

const anonymizeFinancingCaseConfig = {
  protected: true,
  method: "POST",
  path: "/financial_service_providers/financing_cases/{financingCaseId}/anonymize",
  pathVariablesSchema: AnonymizeFinancingCasePathVariablesSchema,
  resultSchema: AnonymizeFinancingCaseResponseSchema,
} satisfies EndpointConfig;

export const anonymizeFinancingCase = createMockServerFetchFunction(
  anonymizeFinancingCaseConfig,
);
