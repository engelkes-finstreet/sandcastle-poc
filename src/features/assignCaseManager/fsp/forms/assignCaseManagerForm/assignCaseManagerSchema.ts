import * as z from "@/lib/zod";
import { FormState } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";

export const assignCaseManagerSchema = z.object({
  financingCaseId: z.string().min(1),
  caseManagerId: z.string().min(1),
});

export type AssignCaseManagerType = z.input<typeof assignCaseManagerSchema>;
export type AssignCaseManagerOutputType = z.output<
  typeof assignCaseManagerSchema
>;
export type AssignCaseManagerDefaultValues = DeepPartial<AssignCaseManagerType>;
export type AssignCaseManagerFormState = FormState;
