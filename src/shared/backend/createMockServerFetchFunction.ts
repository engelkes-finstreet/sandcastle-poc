import {
  fetchFactoryWithErrorHandling,
  FetchHandlerWithErrorHandling,
  validateAndMapResponse,
} from "@finstreet/secure-fetch";
import { getExtracted } from "next-intl/server";
import { getBodySafe } from "@/shared/utils/getBodySafe";

const mockSecureFetchConfig = {
  feApiPath: "/api/mock",
  payloadTransformer: "snake" as const,
};

const mockFetchHandler: FetchHandlerWithErrorHandling = async (
  endpointConfig,
  params,
) => {
  const t = await getExtracted();

  try {
    const { serverFetch } = await import("@finstreet/secure-fetch");

    const response = await serverFetch({
      config: mockSecureFetchConfig,
      endpointConfig,
      ...(params || {}),
    });

    const body = await getBodySafe(response);

    if (response.ok) {
      try {
        if (!endpointConfig.resultSchema) {
          return {
            success: true,
            data: null,
          };
        } else {
          const validatedResponse = await validateAndMapResponse({
            fetchResponse: body.data,
            Schema: endpointConfig.resultSchema,
            transformer: "camel",
          });
          return {
            success: true,
            data: validatedResponse,
          };
        }
      } catch (error) {
        console.error({
          title: "Mock validation error for path: " + endpointConfig.path,
          errorMessage: JSON.stringify(error, null, 2),
        });
        return {
          success: false,
          error: {
            type: "validation",
            status: 422,
            message: t(
              "Es ist ein Validierungsfehler aufgetreten. Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut.",
            ),
          },
        };
      }
    }

    return {
      success: false,
      error: {
        type: "backend",
        status: response.status,
        message: t(
          "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später noch einmal.",
        ),
      },
    };
  } catch (error) {
    console.error({
      title: "Mock network error: ",
      errorMessage: JSON.stringify(error, null, 2),
    });
    return {
      success: false,
      error: {
        type: "network",
        status: 500,
        message: t(
          "Ein Netzwerkfehler ist aufgetreten. Bitte versuchen Sie es später noch einmal.",
        ),
      },
    };
  }
};

export const createMockServerFetchFunction =
  fetchFactoryWithErrorHandling(mockFetchHandler);
