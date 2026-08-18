"use server";

import { deleteLegalRepresentative } from "@/shared/backend/models/legalRepresentatives/server";
import {
  DeleteLegalRepresentativeFormState,
  DeleteLegalRepresentativeOutputType,
} from "./deleteLegalRepresentativeSchema";
import { revalidatePath } from "next/cache";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";
import { routes } from "@/routes";
import { Portal } from "@/shared/types/Portal";

export async function deleteLegalRepresentativeAction(
  state: DeleteLegalRepresentativeFormState,
  formData: DeleteLegalRepresentativeOutputType,
  portal: Portal,
): Promise<DeleteLegalRepresentativeFormState> {
  const result = await deleteLegalRepresentative()({
    pathVariables: {
      financingCaseId: formData.financingCaseId,
      legalRepresentativeId: formData.legalRepresentativeId,
    },
  });

  if (result.success) {
    revalidatePath(
      portal === "customer"
        ? routes.customer.financingCase.legalRepresentatives(
            formData.financingCaseId,
          )
        : routes.fsp.financingCase.legalRepresentatives(
            formData.financingCaseId,
          ),
    );
    return {
      error: null,
      message: "Legal representative deleted successfully",
    };
  } else {
    return handleFormRequestError(result.error);
  }
}
