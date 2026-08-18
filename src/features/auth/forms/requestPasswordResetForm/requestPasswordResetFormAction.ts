"use server";

import { requestPasswordReset } from "@/shared/backend/models/auth/server";
import {
  RequestPasswordResetFormState,
  RequestPasswordResetType,
} from "@/features/auth/forms/requestPasswordResetForm/requestPasswordResetFormSchema";
import { redirect } from "next/navigation";
import { routes } from "@/routes";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";

export async function requestPasswordResetFormAction(
  state: RequestPasswordResetFormState,
  { email }: RequestPasswordResetType,
): Promise<RequestPasswordResetFormState> {
  const result = await requestPasswordReset({
    payload: {
      email,
    },
  });

  if (result.success) {
    redirect(routes.requestPasswordResetSuccess);
  } else {
    return handleFormRequestError(result.error);
  }
}
