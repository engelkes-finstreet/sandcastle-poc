import { FormConfig, FormState } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";

import * as z from "@/lib/zod";

export const assignSubstituteSchema = z.object({
  substitudeId: z.string().min(1),
  membershipId: z.string().nullish(),
});

export type AssignSubstituteType = z.input<typeof assignSubstituteSchema>;
export type AssignSubstituteOutputType = z.output<
  typeof assignSubstituteSchema
>;
export type AssignSubstituteFormState = FormState;
export type AssignSubstituteFormConfig = FormConfig<
  AssignSubstituteFormState,
  AssignSubstituteType,
  AssignSubstituteOutputType
>;
export type AssignSubstituteDefaultValues = DeepPartial<AssignSubstituteType>;
