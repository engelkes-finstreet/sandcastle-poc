"use server";

import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";
import { SubstitutesService } from "@/shared/backend/models/substitutes/fsp/server";
import {
  AssignSubstituteFormState,
  AssignSubstituteOutputType,
} from "./assignSubstituteSchema";
import { revalidatePath } from "next/cache";
import { routes } from "@/routes";

export async function assignSubstituteFormAction(
  state: AssignSubstituteFormState,
  formData: AssignSubstituteOutputType,
): Promise<AssignSubstituteFormState> {
  const { membershipId, substitudeId } = formData;

  const result = membershipId
    ? await SubstitutesService.setMembershipSubstitute({
        pathVariables: { membershipId },
        payload: { substituteId: substitudeId },
      })
    : await SubstitutesService.setSubstitute({
        payload: { substituteId: substitudeId },
      });

  if (result.success) {
    if (membershipId) {
      revalidatePath(routes.admin.members.index);
      revalidatePath(routes.admin.members.substitutes(membershipId));
    } else {
      revalidatePath(routes.fsp.substitutes.index);
    }

    return {
      error: null,
      message: null,
    };
  } else {
    return handleFormRequestError(result.error);
  }
}
