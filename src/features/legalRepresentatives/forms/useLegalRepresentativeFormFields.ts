import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";
import {
  CreateLegalRepresentativeType,
  UpdateLegalRepresentativeType,
} from "./legalRepresentativeSchema";

export function useLegalRepresentativeFormFields(): FormFieldsType<CreateLegalRepresentativeType> {
  const t = useExtracted();

  return {
    soleSignatureAuthorized: {
      type: "checkbox" as const,
      label: t("Diese Person ist alleinvertretungsberechtigt."),
    },
    firstName: {
      type: "input" as const,
      label: t("Vorname"),
    },
    lastName: {
      type: "input" as const,
      label: t("Nachname"),
    },
    email: {
      type: "input" as const,
      label: t("E-Mail-Adresse"),
    },
    phoneNumber: {
      type: "input" as const,
      label: t("Telefonnummer"),
    },
    financingCaseId: {
      type: "hidden" as const,
    },
  };
}

export function useLegalRepresentativeUpdateFormFields(): FormFieldsType<UpdateLegalRepresentativeType> {
  const baseFields = useLegalRepresentativeFormFields();

  return {
    ...baseFields,
    legalRepresentativeId: {
      type: "hidden" as const,
    },
  };
}
