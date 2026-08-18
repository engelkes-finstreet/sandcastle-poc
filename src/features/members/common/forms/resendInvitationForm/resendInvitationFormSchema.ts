import * as z from "@/lib/zod";
import { FormConfig, FormState } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";

export const resendInvitationFormSchema = z.object({
  invitationId: z.trimmedString(),
});

export type ResendInvitationFormType = z.input<
  typeof resendInvitationFormSchema
>;
export type ResendInvitationFormOutputType = z.output<
  typeof resendInvitationFormSchema
>;
export type ResendInvitationFormState = FormState;
export type ResendInvitationFormConfig = FormConfig<
  ResendInvitationFormState,
  ResendInvitationFormType,
  ResendInvitationFormOutputType
>;

export type ResendInvitationDefaultValues =
  DeepPartial<ResendInvitationFormType>;
