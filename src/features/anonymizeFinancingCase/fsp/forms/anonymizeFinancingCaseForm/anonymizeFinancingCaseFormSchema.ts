import * as z from "@/lib/zod";
import { FormConfig, FormState } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";

export const anonymizeFinancingCaseSchema = z.object({
  financingCaseId: z.trimmedString(),
});

export type AnonymizeFinancingCaseType = z.input<
  typeof anonymizeFinancingCaseSchema
>;
export type AnonymizeFinancingCaseOutputType = z.output<
  typeof anonymizeFinancingCaseSchema
>;
export type AnonymizeFinancingCaseFormState = FormState;
export type AnonymizeFinancingCaseFormConfig = FormConfig<
  AnonymizeFinancingCaseFormState,
  AnonymizeFinancingCaseType,
  AnonymizeFinancingCaseOutputType
>;

export type AnonymizeFinancingCaseDefaultValues =
  DeepPartial<AnonymizeFinancingCaseType>;
