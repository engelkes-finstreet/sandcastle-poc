import { ResetPasswordType } from "@/features/auth/forms/resetPasswordForm/resetPasswordFormSchema";
import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";

export function useResetPasswordFormFields(): FormFieldsType<ResetPasswordType> {
  const t = useExtracted();

  return {
    password: {
      type: "password",
      label: t("Passwort"),
    },
    passwordConfirmation: {
      type: "password",
      label: t("Passwort bestätigen"),
    },
    passwordResetToken: {
      type: "hidden",
    },
  };
}
