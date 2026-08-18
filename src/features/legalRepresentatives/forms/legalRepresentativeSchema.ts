import * as z from "@/lib/zod";
import { PhoneNumberValidationSchema } from "@/shared/validations/PhoneNumberValidationSchema";
import { FormState, FormConfig } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";

const baseSchema = z.object({
  soleSignatureAuthorized: z.boolean(),
  firstName: z.trimmedString().min(1).max(50),
  lastName: z.trimmedString().min(1).max(50),
  email: z.trimmedString().min(1).email(),
  phoneNumber: PhoneNumberValidationSchema,
  financingCaseId: z.trimmedString().min(1),
});

export const createLegalRepresentativeSchema = baseSchema;

export const updateLegalRepresentativeSchema = baseSchema.extend({
  legalRepresentativeId: z.trimmedString().min(1),
});

export type CreateLegalRepresentativeType = z.input<
  typeof createLegalRepresentativeSchema
>;
export type CreateLegalRepresentativeOutputType = z.output<
  typeof createLegalRepresentativeSchema
>;
export type CreateLegalRepresentativeFormState = FormState;
export type CreateLegalRepresentativeFormConfig = FormConfig<
  CreateLegalRepresentativeFormState,
  CreateLegalRepresentativeType,
  CreateLegalRepresentativeOutputType
>;

export type UpdateLegalRepresentativeType = z.input<
  typeof updateLegalRepresentativeSchema
>;
export type UpdateLegalRepresentativeOutputType = z.output<
  typeof updateLegalRepresentativeSchema
>;
export type UpdateLegalRepresentativeFormState = FormState;
export type UpdateLegalRepresentativeFormConfig = FormConfig<
  UpdateLegalRepresentativeFormState,
  UpdateLegalRepresentativeType,
  UpdateLegalRepresentativeOutputType
>;

export type LegalRepresentativeDefaultValues =
  DeepPartial<UpdateLegalRepresentativeType>;
