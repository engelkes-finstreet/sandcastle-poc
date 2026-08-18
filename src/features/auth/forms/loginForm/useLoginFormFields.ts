import { LoginType } from "@/features/auth/forms/loginForm/loginFormSchema";
import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";

export function useLoginFormFields(): FormFieldsType<LoginType> {
  const t = useExtracted();

  return {
    email: {
      type: "input",
      label: t("E-Mail-Adresse"),
    },
    password: {
      type: "password",
      label: t("Passwort"),
    },
  };
}
