import { EndpointConfig } from "@finstreet/secure-fetch";
import {
  GetRequestsWithDocumentsResponseSchema,
  RequestsWithDocumentsPathVariablesSchema,
  DocumentUploadPathVariablesSchema,
  DocumentUploadPayloadSchema,
  DocumentUploadResultSchema,
  DocumentDeletePathVariablesSchema,
  DownloadDocumentPathVariablesSchema,
  DownloadDocumentResponseSchema,
} from "./schema";
import { createMockServerFetchFunction } from "@/shared/backend/createMockServerFetchFunction";

const getRequestsWithDocumentsConfig = {
  protected: true,
  method: "GET",
  path: "/financing_cases/{financingCaseId}/document_exchange/requests_with_documents",
  resultSchema: GetRequestsWithDocumentsResponseSchema,
  pathVariablesSchema: RequestsWithDocumentsPathVariablesSchema,
} satisfies EndpointConfig;

const postDocumentDirectUploadConfig = {
  protected: true,
  method: "POST",
  path: "/financing_cases/{financingCaseId}/document_exchange/direct_upload",
  pathVariablesSchema: DocumentUploadPathVariablesSchema,
  payloadSchema: DocumentUploadPayloadSchema,
  resultSchema: DocumentUploadResultSchema,
} satisfies EndpointConfig;

const deleteDocumentConfig = {
  protected: true,
  method: "DELETE",
  path: "/financing_cases/{financingCaseId}/document_exchange/{documentId}",
  pathVariablesSchema: DocumentDeletePathVariablesSchema,
} satisfies EndpointConfig;

const getDocumentDownloadConfig = {
  protected: true,
  method: "GET",
  path: "/financing_cases/{financingCaseId}/document_exchange/{documentId}/download",
  pathVariablesSchema: DownloadDocumentPathVariablesSchema,
  resultSchema: DownloadDocumentResponseSchema,
} satisfies EndpointConfig;

export const DocumentExchangeService = {
  getRequestsWithDocuments: createMockServerFetchFunction(
    getRequestsWithDocumentsConfig,
  ),
  uploadDocument: createMockServerFetchFunction(postDocumentDirectUploadConfig),
  deleteDocument: createMockServerFetchFunction(deleteDocumentConfig),
  getDocumentDownload: createMockServerFetchFunction(getDocumentDownloadConfig),
};
