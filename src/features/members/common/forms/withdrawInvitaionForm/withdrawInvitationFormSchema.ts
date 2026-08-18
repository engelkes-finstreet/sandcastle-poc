import * as z from "@/lib/zod";
import { FormConfig, FormState } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";

export const withdrawInvitationFormSchema = z.object({
  invitationId: z.trimmedString(),
});

export type WithdrawInvitationFormType = z.input<
  typeof withdrawInvitationFormSchema
>;
export type WithdrawInvitationFormOutputType = z.output<
  typeof withdrawInvitationFormSchema
>;
export type WithdrawInvitationFormState = FormState;
export type WithdrawInvitationFormConfig = FormConfig<
  WithdrawInvitationFormState,
  WithdrawInvitationFormType,
  WithdrawInvitationFormOutputType
>;

export type WithdrawInvitationDefaultValues =
  DeepPartial<WithdrawInvitationFormType>;
