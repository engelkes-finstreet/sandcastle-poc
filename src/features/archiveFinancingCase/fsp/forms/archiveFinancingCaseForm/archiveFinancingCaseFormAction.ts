"use server";

import { routes } from "@/routes";
import { archiveFinancingCase } from "@/features/archiveFinancingCase/fsp/backend/server";
import { revalidatePath } from "next/cache";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";
import {
  ArchiveFinancingCaseFormState,
  ArchiveFinancingCaseType,
} from "@/features/archiveFinancingCase/fsp/forms/archiveFinancingCaseForm/archiveFinancingCaseFormSchema";

export async function archiveFinancingCaseFormAction(
  state: ArchiveFinancingCaseFormState,
  { financingCaseId, archiveReason }: ArchiveFinancingCaseType,
): Promise<ArchiveFinancingCaseFormState> {
  const result = await archiveFinancingCase({
    pathVariables: {
      financingCaseId,
    },
    payload: {
      reason: archiveReason,
    },
  });

  if (result.success) {
    revalidatePath(routes.fsp.financingCase.overview(financingCaseId));
    return { error: null, message: null };
  } else {
    return handleFormRequestError(result.error);
  }
}
