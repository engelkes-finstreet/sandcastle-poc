import {
  clientFetch,
  fetchFactory,
  FetchHandler,
  validateAndMapResponse,
} from "@finstreet/secure-fetch";
import { getBodySafe } from "@/shared/utils/getBodySafe";

const mockSecureFetchConfig = {
  feApiPath: "/api/mock",
  payloadTransformer: "snake" as const,
};

const mockFetchHandler: FetchHandler = async (endpointConfig, params) => {
  const response = await clientFetch({
    config: mockSecureFetchConfig,
    endpointConfig,
    ...(params || {}),
  });

  if (!response.ok) {
    throw new Error();
  }

  const body = await getBodySafe(response);

  return validateAndMapResponse({
    fetchResponse: body.data,
    Schema: endpointConfig.resultSchema,
    transformer: "camel",
  });
};

export const createMockClientFetchFunction = fetchFactory(mockFetchHandler);
