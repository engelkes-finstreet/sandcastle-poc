import * as z from "@/lib/zod";

import { YesNoValidationSchema } from "@/shared/backend/models/validations/YesNoValidationSchema";
import { FormConfig, FormState } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";

export const inviteMemberFormSchema = z.object({
  firstName: z.trimmedString().min(1),
  lastName: z.trimmedString().min(1),
  email: z.trimmedString().email(),
  department: z.trimmedString().min(1),
  signingGroup: z.trimmedString().min(1),
  conditionsManagement: YesNoValidationSchema,
});

export const updateMemberFormSchema = inviteMemberFormSchema.extend({
  membershipId: z.trimmedString().min(1),
});

export type UpdateMemberFormType = z.input<typeof updateMemberFormSchema>;
export type UpdateMemberFormOutputType = z.output<
  typeof updateMemberFormSchema
>;
export type UpdateMemberFormState = FormState;
export type UpdateMemberFormConfig = FormConfig<
  UpdateMemberFormState,
  UpdateMemberFormType,
  UpdateMemberFormOutputType
>;
export type InviteMemberFormType = z.input<typeof inviteMemberFormSchema>;
export type InviteMemberFormOutputType = z.output<
  typeof inviteMemberFormSchema
>;
export type InviteMemberFormState = FormState;
export type InviteMemberFormConfig = FormConfig<
  InviteMemberFormState,
  InviteMemberFormType,
  InviteMemberFormOutputType
>;

export type InviteMemberDefaultValues = DeepPartial<InviteMemberFormType>;
export type UpdateMemberDefaultValues = DeepPartial<UpdateMemberFormType>;
