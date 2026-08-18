import { EndpointConfig } from "@finstreet/secure-fetch";
import {
  GetCaseManagerCandidatesResponseSchema,
  GetCaseManagerCandidatesPathVariablesSchema,
} from "./schema";
import { createMockClientFetchFunction } from "@/shared/backend/createMockClientFetchFunction";

const getCaseManagerCandidatesConfig = {
  protected: true,
  method: "GET",
  path: "/financing_cases/{financingCaseId}/case_managers/candidates",
  resultSchema: GetCaseManagerCandidatesResponseSchema,
  pathVariablesSchema: GetCaseManagerCandidatesPathVariablesSchema,
} satisfies EndpointConfig;

export const getCaseManagerCandidates = createMockClientFetchFunction(
  getCaseManagerCandidatesConfig,
);
