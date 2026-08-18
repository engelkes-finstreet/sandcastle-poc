import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";
import { SetNewPasswordType } from "@/features/auth/forms/setNewPasswordForm/setNewPasswordFormSchema";

export function useSetNewPasswordFormFields(): FormFieldsType<SetNewPasswordType> {
  const t = useExtracted();

  return {
    password: {
      type: "password",
      label: t("Passwort"),
    },
  };
}
