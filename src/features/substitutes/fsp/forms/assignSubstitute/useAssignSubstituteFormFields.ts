"use client";

import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";

import { useSubstituteCandidatesOptions } from "./options/substituteCandidates";
import { AssignSubstituteType } from "./assignSubstituteSchema";

type UseAssignSubstituteFormFieldsParams = {
  membershipId?: string | null;
};

export function useAssignSubstituteFormFields({
  membershipId,
}: UseAssignSubstituteFormFieldsParams = {}): FormFieldsType<AssignSubstituteType> {
  const t = useExtracted();
  const substituteCandidatesOptions = useSubstituteCandidatesOptions({
    membershipId,
  });

  return {
    substitudeId: {
      type: "select",
      label: t("Vertretende Person"),
      items: substituteCandidatesOptions,
    },
    membershipId: {
      type: "hidden",
    },
  };
}
