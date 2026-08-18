import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";
import { GetCaseManagerCandidatesResponse } from "@/features/assignCaseManager/fsp/backend/schema";
import { AssignCaseManagerType } from "@/features/assignCaseManager/fsp/forms/assignCaseManagerForm/assignCaseManagerSchema";

export function useAssignCaseManagerFields(
  caseManagerCandidates: GetCaseManagerCandidatesResponse,
): FormFieldsType<AssignCaseManagerType> {
  const t = useExtracted();

  return {
    financingCaseId: {
      type: "hidden",
    },
    caseManagerId: {
      type: "select",
      label: t("Bearbeiter"),
      items: caseManagerCandidates.map((candidate) => ({
        label: `${candidate.firstName} ${candidate.lastName}`,
        value: candidate.membershipId,
      })),
    },
  };
}
