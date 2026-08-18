import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";
import { RequestPasswordResetType } from "@/features/auth/forms/requestPasswordResetForm/requestPasswordResetFormSchema";

export function useRequestPasswordResetFormFields(): FormFieldsType<RequestPasswordResetType> {
  const t = useExtracted();

  return {
    email: {
      type: "input",
      label: t("E-Mail-Adresse"),
    },
  };
}
