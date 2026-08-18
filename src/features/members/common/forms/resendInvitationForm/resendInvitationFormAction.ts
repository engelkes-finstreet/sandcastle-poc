"use server";

import {
  ResendInvitationFormState,
  ResendInvitationFormType,
} from "@/features/members/common/forms/resendInvitationForm/resendInvitationFormSchema";
import { routes } from "@/routes";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";
import { revalidatePath } from "next/cache";
import { resendInvitation } from "@/shared/backend/models/invitations/server";

export async function resendInvitationFormAction(
  state: ResendInvitationFormState,
  formData: ResendInvitationFormType,
): Promise<ResendInvitationFormState> {
  const result = await resendInvitation({
    pathVariables: {
      id: formData.invitationId,
    },
  });

  if (result.success) {
    revalidatePath(routes.admin.members.index);
    revalidatePath(routes.customer.members.index);
    return {
      error: null,
      message: null,
    };
  } else {
    return handleFormRequestError(result.error);
  }
}
