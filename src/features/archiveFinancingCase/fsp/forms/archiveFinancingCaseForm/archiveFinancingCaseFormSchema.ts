import * as z from '@/lib/zod'
import { FormConfig, FormState } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";


export const archiveFinancingCaseSchema = z.object({
  financingCaseId: z.trimmedString(),
  archiveReason: z.trimmedString(),
});

export type ArchiveFinancingCaseType = z.input<typeof archiveFinancingCaseSchema>;
export type ArchiveFinancingCaseOutputType = z.output<typeof archiveFinancingCaseSchema>;
export type ArchiveFinancingCaseFormState = FormState;
export type ArchiveFinancingCaseFormConfig = FormConfig<ArchiveFinancingCaseFormState, ArchiveFinancingCaseType, ArchiveFinancingCaseOutputType>;

export type ArchiveFinancingCaseDefaultValues = DeepPartial<ArchiveFinancingCaseType>;
