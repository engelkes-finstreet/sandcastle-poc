"use server";

import {
  WithdrawInvitationFormOutputType,
  WithdrawInvitationFormState,
} from "@/features/members/common/forms/withdrawInvitaionForm/withdrawInvitationFormSchema";
import { routes } from "@/routes";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";
import { withdrawInvitation } from "@/shared/backend/models/invitations/server";
import { revalidatePath } from "next/cache";

export async function withdrawInvitationFormAction(
  state: WithdrawInvitationFormState,
  formData: WithdrawInvitationFormOutputType,
): Promise<WithdrawInvitationFormState> {
  const result = await withdrawInvitation({
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
