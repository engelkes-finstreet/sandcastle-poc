import * as z from "@/lib/zod";
import { FormState } from "@finstreet/forms";
import { PasswordValidationSchema } from "@/shared/validations/PasswordValidationSchema";
import { CustomErrorType } from "@/i18n/useTranslatedError";

export const resetPasswordSchema = z
  .object({
    password: PasswordValidationSchema,
    passwordConfirmation: z.trimmedString(),
    passwordResetToken: z.trimmedString(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    params: { errorType: CustomErrorType.PASSWORD_MISMATCH },
  });

export type ResetPasswordType = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordFormState = FormState;
