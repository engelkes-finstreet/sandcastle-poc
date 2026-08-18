import { CustomErrorType } from "@/i18n/useTranslatedError";
import * as z from "@/lib/zod";
import IBAN from "iban";

export const IbanValidationSchema = z
  .trimmedString()
  .min(1)
  .superRefine((iban, ctx) => {
    const isValid = IBAN.isValid(iban);

    if (!isValid) {
      ctx.addIssue({
        code: "custom",
        params: {
          errorType: CustomErrorType.INVALID_IBAN,
        },
      });
    }
  });
