import * as z from "@/lib/zod";
import { FormState, FormConfig } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";

export const deleteLegalRepresentativeSchema = z.object({
  financingCaseId: z.trimmedString().min(1),
  legalRepresentativeId: z.trimmedString().min(1),
});

export type DeleteLegalRepresentativeType = z.input<
  typeof deleteLegalRepresentativeSchema
>;
export type DeleteLegalRepresentativeOutputType = z.output<
  typeof deleteLegalRepresentativeSchema
>;
export type DeleteLegalRepresentativeFormState = FormState;
export type DeleteLegalRepresentativeFormConfig = FormConfig<
  DeleteLegalRepresentativeFormState,
  DeleteLegalRepresentativeType,
  DeleteLegalRepresentativeOutputType
>;
export type DeleteLegalRepresentativeDefaultValues =
  DeepPartial<DeleteLegalRepresentativeType>;
