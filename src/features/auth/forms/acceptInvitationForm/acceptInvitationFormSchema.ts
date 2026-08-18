import * as z from "@/lib/zod";
import { FormState } from "@finstreet/forms";
import { PasswordValidationSchema } from "@/shared/validations/PasswordValidationSchema";
import { CustomErrorType } from "@/i18n/useTranslatedError";

export const acceptInvitationSchema = z
  .object({
    password: PasswordValidationSchema,
    passwordConfirmation: z.trimmedString(),
    firstName: z.trimmedString(),
    lastName: z.trimmedString(),
    token: z.trimmedString(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    params: { errorType: CustomErrorType.PASSWORD_MISMATCH },
  });

export type AcceptInvitationType = z.infer<typeof acceptInvitationSchema>;
export type AcceptInvitationFormState = FormState;
