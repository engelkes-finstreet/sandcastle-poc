import * as z from "@/lib/zod";
import { DocumentRequestItemSchema } from "@/shared/backend/models/common/DocumentRequestItem";

// GET requests_with_documents
export const RequestsWithDocumentsPathVariablesSchema = z.object({
  financingCaseId: z.string(),
});

export const DocumentRequestFlagsSchema = z.object({
  editable: z.boolean(),
});

export const DocumentExchangeHeaderSchema = z.object({
  companyName: z.string(),
});

export const GetRequestsWithDocumentsResponseSchema = z.object({
  header: DocumentExchangeHeaderSchema,
  flags: DocumentRequestFlagsSchema,
  documentRequests: z.array(DocumentRequestItemSchema),
});

export type GetRequestsWithDocumentsResponseType = z.infer<
  typeof GetRequestsWithDocumentsResponseSchema
>;

// POST direct_upload
export const DocumentUploadPathVariablesSchema = z.object({
  financingCaseId: z.string(),
});

export type DocumentUploadPathVariablesType = z.infer<
  typeof DocumentUploadPathVariablesSchema
>;

export const DocumentUploadPayloadSchema = z.object({
  documentRequestId: z.string(),
  blob: z.object({
    filename: z.string(),
    checksum: z.string(),
    contentType: z.string(),
    byteSize: z.number(),
  }),
});

export type DocumentUploadPayloadType = z.infer<
  typeof DocumentUploadPayloadSchema
>;

export const DocumentUploadResultSchema = z.object({
  documentId: z.string(),
  blob: z.object({
    directUpload: z.object({
      url: z.string(),
      headers: z.record(z.string(), z.string()),
    }),
  }),
});

export type DocumentUploadResultType = z.infer<
  typeof DocumentUploadResultSchema
>;

// DELETE document
export const DocumentDeletePathVariablesSchema = z.object({
  financingCaseId: z.string(),
  documentId: z.string(),
});

export type DocumentDeletePathVariablesType = z.infer<
  typeof DocumentDeletePathVariablesSchema
>;

// GET document download
export const DownloadDocumentPathVariablesSchema = z.object({
  financingCaseId: z.string(),
  documentId: z.string(),
});

export type DownloadDocumentPathVariablesType = z.infer<
  typeof DownloadDocumentPathVariablesSchema
>;

export const DownloadDocumentResponseSchema = z.object({
  documentId: z.string(),
  downloadUrl: z.string(),
});

export type DownloadDocumentResponseType = z.infer<
  typeof DownloadDocumentResponseSchema
>;
