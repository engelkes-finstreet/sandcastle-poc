import * as z from "@/lib/zod";
import { FormConfig, FormState } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";

export const updateInternalRemarkFormSchema = z.object({
  financingCaseId: z.trimmedString(),
  internalRemark: z.trimmedString().max(10000),
});

export type UpdateInternalRemarkFormType = z.input<
  typeof updateInternalRemarkFormSchema
>;
export type UpdateInternalRemarkFormOutputType = z.output<
  typeof updateInternalRemarkFormSchema
>;
export type UpdateInternalRemarkFormState = FormState;
export type UpdateInternalRemarkFormConfig = FormConfig<
  UpdateInternalRemarkFormState,
  UpdateInternalRemarkFormType,
  UpdateInternalRemarkFormOutputType
>;

export type UpdateInternalRemarkFormDefaultValues =
  DeepPartial<UpdateInternalRemarkFormType>;
