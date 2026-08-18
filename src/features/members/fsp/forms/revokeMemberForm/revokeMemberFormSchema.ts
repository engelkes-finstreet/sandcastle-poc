import * as z from "@/lib/zod";
import { FormConfig, FormState } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";

export const revokeMemberFormSchema = z.object({
  membershipId: z.trimmedString(),
});

export type RevokeMemberFormType = z.input<typeof revokeMemberFormSchema>;
export type RevokeMemberFormOutputType = z.output<
  typeof revokeMemberFormSchema
>;
export type RevokeMemberFormState = FormState;
export type RevokeMemberFormConfig = FormConfig<
  RevokeMemberFormState,
  RevokeMemberFormType,
  RevokeMemberFormOutputType
>;

export type RevokeMemberDefaultValues = DeepPartial<RevokeMemberFormType>;
