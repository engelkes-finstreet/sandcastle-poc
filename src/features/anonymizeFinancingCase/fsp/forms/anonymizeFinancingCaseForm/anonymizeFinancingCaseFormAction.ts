"use server";

import { anonymizeFinancingCase } from "@/features/anonymizeFinancingCase/fsp/backend/server";
import {
  AnonymizeFinancingCaseFormState,
  AnonymizeFinancingCaseType,
} from "@/features/anonymizeFinancingCase/fsp/forms/anonymizeFinancingCaseForm/anonymizeFinancingCaseFormSchema";
import { revalidatePath } from "next/cache";
import { routes } from "@/routes";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";

export default async function anonymizeFinancingCaseFormAction(
  state: AnonymizeFinancingCaseFormState,
  { financingCaseId }: AnonymizeFinancingCaseType,
) {
  const result = await anonymizeFinancingCase({
    pathVariables: {
      financingCaseId,
    },
  });

  if (result.success) {
    revalidatePath(routes.fsp.financingCase.overview(financingCaseId));
    return { error: null, message: null };
  } else {
    return handleFormRequestError(result.error);
  }
}
