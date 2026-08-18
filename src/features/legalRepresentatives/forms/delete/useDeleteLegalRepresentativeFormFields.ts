import { FormFieldsType } from "@finstreet/forms";
import { DeleteLegalRepresentativeType } from "./deleteLegalRepresentativeSchema";

export function useDeleteLegalRepresentativeFormFields(): FormFieldsType<DeleteLegalRepresentativeType> {
  return {
    financingCaseId: {
      type: "hidden",
    },
    legalRepresentativeId: {
      type: "hidden",
    },
  };
}
