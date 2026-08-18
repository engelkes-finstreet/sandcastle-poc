import {
  clientFetch,
  FetchHandler,
  validateAndMapResponse,
  fetchFactory,
} from "@finstreet/secure-fetch";
import { secureFetchConfig } from "@/shared/backend/secureFetchConfig";
import { getBodySafe } from "@/shared/utils/getBodySafe";

const fetchHandler: FetchHandler = async (endpointConfig, params) => {
  const response = await clientFetch({
    config: secureFetchConfig,
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

export const createClientFetchFunction = fetchFactory(fetchHandler);
