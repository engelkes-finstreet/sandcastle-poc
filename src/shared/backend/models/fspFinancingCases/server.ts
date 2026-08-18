import { EndpointConfig } from "@finstreet/secure-fetch";
import { createMockServerFetchFunction } from "@/shared/backend/createMockServerFetchFunction";
import {
  GetFspFinancingCasesResponseSchema,
  GetFspFinancingCasesResponseType,
} from "./schema";

const getFspFinancingCasesConfig = (path: string) =>
  ({
    protected: true,
    method: "GET",
    path,
    resultSchema: GetFspFinancingCasesResponseSchema,
  }) satisfies EndpointConfig;

export const fetchFspFinancingCases = (path: string) =>
  createMockServerFetchFunction(getFspFinancingCasesConfig(path));

export type { GetFspFinancingCasesResponseType };
