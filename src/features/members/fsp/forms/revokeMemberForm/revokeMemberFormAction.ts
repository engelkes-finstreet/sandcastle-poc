"use server";

import { routes } from "@/routes";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";
import { revokeMembership } from "@/shared/backend/models/memberships/server";
import { revalidatePath } from "next/cache";
import {
  RevokeMemberFormOutputType,
  RevokeMemberFormState,
} from "@/features/members/fsp/forms/revokeMemberForm/revokeMemberFormSchema";

export async function revokeMemberFormAction(
  state: RevokeMemberFormState,
  formData: RevokeMemberFormOutputType,
): Promise<RevokeMemberFormState> {
  const result = await revokeMembership({
    pathVariables: {
      id: formData.membershipId,
    },
  });

  if (result.success) {
    revalidatePath(routes.admin.members.index);
    return {
      error: null,
      message: null,
    };
  } else {
    return handleFormRequestError(result.error);
  }
}
