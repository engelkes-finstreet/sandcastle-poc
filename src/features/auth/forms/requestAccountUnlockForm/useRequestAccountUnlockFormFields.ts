import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";
import { RequestAccountUnlockType } from "@/features/auth/forms/requestAccountUnlockForm/requestAccountUnlockFormSchema";

export function useRequestAccountUnlockFormFields(): FormFieldsType<RequestAccountUnlockType> {
  const t = useExtracted();

  return {
    email: {
      type: "input",
      label: t("E-Mail-Adresse"),
    },
  };
}
