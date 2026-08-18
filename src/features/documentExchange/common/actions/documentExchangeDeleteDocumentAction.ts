"use server";

import { DocumentExchangeService } from "@/features/documentExchange/backend/server";
import { revalidatePath } from "next/cache";
import { routes } from "@/routes";

export async function documentExchangeDeleteDocumentAction({
  financingCaseId,
  documentId,
}: {
  financingCaseId: string;
  documentId: string;
}) {
  const deleteDocumentResponse = await DocumentExchangeService.deleteDocument({
    pathVariables: {
      financingCaseId,
      documentId,
    },
  });

  if (deleteDocumentResponse.success) {
    revalidatePath(routes.fsp.financingCase.documents(financingCaseId));
    revalidatePath(routes.customer.financingCase.documents(financingCaseId));
  }

  return;
}
