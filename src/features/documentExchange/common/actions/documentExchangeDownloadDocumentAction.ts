"use server";

import { DocumentExchangeService } from "@/features/documentExchange/backend/server";

export async function documentExchangeDownloadDocumentAction({
  financingCaseId,
  documentId,
}: {
  financingCaseId: string;
  documentId: string;
}): Promise<{ success: boolean; downloadUrl?: string }> {
  const documentDownloadResponse =
    await DocumentExchangeService.getDocumentDownload({
      pathVariables: {
        financingCaseId,
        documentId,
      },
    });

  if (documentDownloadResponse.success) {
    return {
      success: true,
      downloadUrl: documentDownloadResponse.data.downloadUrl,
    };
  }

  return { success: false };
}
