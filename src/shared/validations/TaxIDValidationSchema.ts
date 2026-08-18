import { CustomErrorType } from "@/i18n/useTranslatedError";
import * as z from "@/lib/zod";

export const TaxIDValidationSchema = z
  .trimmedString()
  .min(8)
  .max(20)
  .superRefine((value, ctx) => {
    const isValid = z
      .string()
      .regex(/^[0-9/]+$/)
      .safeParse(value).success;

    if (!isValid) {
      ctx.addIssue({
        code: "custom",
        params: { errorType: CustomErrorType.INVALID_TAX_ID },
      });
    }
  });
