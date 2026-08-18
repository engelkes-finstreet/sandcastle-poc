"use server";

import { routes } from "@/routes";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";
import { revalidatePath } from "next/cache";
import {
  AssignCaseManagerFormState,
  AssignCaseManagerOutputType,
} from "@/features/assignCaseManager/fsp/forms/assignCaseManagerForm/assignCaseManagerSchema";
import { assignCaseManager } from "@/features/assignCaseManager/fsp/backend/server";

export async function assignCaseManagerAction(
  state: AssignCaseManagerFormState,
  formData: AssignCaseManagerOutputType,
): Promise<AssignCaseManagerFormState> {
  const assignResult = await assignCaseManager({
    pathVariables: {
      financingCaseId: formData.financingCaseId,
    },
    payload: {
      assigneeId: formData.caseManagerId,
    },
  });

  if (assignResult.success) {
    revalidatePath(routes.fsp.financingCase.list());
    revalidatePath(routes.fsp.financingCase.overview(formData.financingCaseId));
    return {
      error: null,
      message: null,
    };
  } else {
    return handleFormRequestError(assignResult.error);
  }
}
