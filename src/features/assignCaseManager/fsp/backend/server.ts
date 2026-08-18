import { EndpointConfig } from "@finstreet/secure-fetch";
import {
  AssignCaseManagerPathVariablesSchema,
  AssignCaseManagerPayloadSchema,
} from "./schema";
import { createMockServerFetchFunction } from "@/shared/backend/createMockServerFetchFunction";

const assignCaseManagerConfig = {
  protected: true,
  method: "POST",
  path: "/financing_cases/{financingCaseId}/case_managers/assign",
  pathVariablesSchema: AssignCaseManagerPathVariablesSchema,
  payloadSchema: AssignCaseManagerPayloadSchema,
} satisfies EndpointConfig;

export const assignCaseManager = createMockServerFetchFunction(
  assignCaseManagerConfig,
);
