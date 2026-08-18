"use server";

import { redirect } from "next/navigation";
import { acceptInvitation } from "@/shared/backend/models/auth/server";
import { routes } from "@/routes";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";
import {
  AcceptInvitationFormState,
  AcceptInvitationType,
} from "@/features/auth/forms/acceptInvitationForm/acceptInvitationFormSchema";

export async function acceptInvitationFormAction(
  state: AcceptInvitationFormState,
  { password, token, firstName, lastName }: AcceptInvitationType,
): Promise<AcceptInvitationFormState> {
  const result = await acceptInvitation({
    payload: {
      token,
      user: {
        password,
        firstName,
        lastName,
      },
    },
  });

  if (result.success) {
    redirect(routes.auth.login());
  } else {
    return handleFormRequestError(result.error);
  }
}
