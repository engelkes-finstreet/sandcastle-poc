import { CustomErrorType } from "@/i18n/useTranslatedError";
import { Constants } from "@/shared/utils/constants";
import * as z from "@/lib/zod";

export const PasswordValidationSchema = z
  .trimmedString()
  .superRefine((value, ctx) => {
    const valid = new RegExp(Constants.passwordPattern).test(value);
    if (!valid) {
      ctx.addIssue({
        code: "custom",
        params: {
          errorType: CustomErrorType.PASSWORD_INVALID,
        },
      });
    }
  });
