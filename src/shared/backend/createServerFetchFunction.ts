import {
  fetchFactoryWithErrorHandling,
  FetchHandlerWithErrorHandling,
  serverFetch,
  validateAndMapResponse,
} from "@finstreet/secure-fetch";
import { secureFetchConfig } from "./secureFetchConfig";
import { getExtracted } from "next-intl/server";
import { getBodySafe } from "@/shared/utils/getBodySafe";

const createBaseFetchHandler = (config: {
  validateResponse: (body: any, schema: any) => Promise<any>;
  transformSuccessResponse: (validatedResponse: any, body: any) => any;
}): FetchHandlerWithErrorHandling => {
  return async (endpointConfig, params) => {
    const t = await getExtracted();

    try {
      const response = await serverFetch({
        config: secureFetchConfig,
        endpointConfig,
        ...(params || {}),
      });

      if (response.ok && !endpointConfig.resultSchema) {
        return {
          success: true,
          data: null,
        };
      }

      const body = await getBodySafe(response);

      if (response.ok) {
        try {
          const validatedResponse = await config.validateResponse(
            body.data,
            endpointConfig.resultSchema,
          );
          return {
            success: true,
            data: config.transformSuccessResponse(validatedResponse, body),
          };
        } catch (error) {
          console.error({
            title:
              "Next.js validation error of RoR backend response for path: " +
              endpointConfig.path,
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

      const title = body.errors ? body.errors[0]?.title : "";
      const detail = body.errors ? body.errors[0]?.detail : "";
      let errorMessage: string;
      if (title) {
        errorMessage = `${title} ${detail ? `\n ${detail}` : ""}`;
      } else {
        errorMessage = t(
          "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später noch einmal.",
        );
      }

      console.error({
        title: "RoR backend error: ",
        errorMessage,
        request: endpointConfig.path,
      });
      console.error({ body: JSON.stringify(body, null, 2) });
      if (response.status === 409) {
        return {
          success: false,
          error: {
            type: "backend",
            status: response.status,
            message:
              errorMessage ??
              t(
                "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später noch einmal.",
              ),
            body,
          },
        };
      } else {
        return {
          success: false,
          error: {
            type: "backend",
            status: response.status,
            message:
              errorMessage ??
              t(
                "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später noch einmal.",
              ),
          },
        };
      }
    } catch (error) {
      console.error({
        title: "Network error: ",
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
};

export const fetchHandlerWithErrorHandling = createBaseFetchHandler({
  validateResponse: (body, schema) =>
    validateAndMapResponse({
      fetchResponse: body,
      Schema: schema,
      transformer: "camel",
    }),
  transformSuccessResponse: (validatedResponse) => validatedResponse,
});

export const createServerFetchFunction = fetchFactoryWithErrorHandling(
  fetchHandlerWithErrorHandling,
);

const fetchPaginatedHandler = createBaseFetchHandler({
  validateResponse: (body, schema) =>
    validateAndMapResponse({
      fetchResponse: body,
      Schema: schema.shape.response,
      transformer: "camel",
    }),
  transformSuccessResponse: (validatedResponse, body) => ({
    response: validatedResponse,
    meta: body.meta,
  }),
});

export const createPaginatedServerFetchFunction = fetchFactoryWithErrorHandling(
  fetchPaginatedHandler,
);
