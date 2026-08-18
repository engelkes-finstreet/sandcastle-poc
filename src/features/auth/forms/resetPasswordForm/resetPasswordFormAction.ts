"use server";

import { resetPassword } from "@/shared/backend/models/auth/server";
import {
  ResetPasswordFormState,
  ResetPasswordType,
} from "@/features/auth/forms/resetPasswordForm/resetPasswordFormSchema";
import { redirect } from "next/navigation";
import { routes } from "@/routes";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";

export async function resetPasswordFormAction(
  state: ResetPasswordFormState,
  { password, passwordResetToken }: ResetPasswordType,
): Promise<ResetPasswordFormState> {
  const result = await resetPassword({
    payload: {
      password,
      passwordResetToken,
    },
  });

  if (result.success) {
    redirect(routes.loginPasswordResetSuccess);
  } else {
    return handleFormRequestError(result.error);
  }
}
