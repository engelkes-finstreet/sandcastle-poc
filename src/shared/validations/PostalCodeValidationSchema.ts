import { CustomErrorType } from "@/i18n/useTranslatedError";
import * as z from "@/lib/zod";

// Helper function for zip code validation
export const PostalCodeValidationSchema = z
  .trimmedString()
  .superRefine((postalCode, ctx) => {
    const isValid = z
      .string()
      .regex(/^\d{5}$/)
      .safeParse(postalCode).success;

    if (!isValid) {
      ctx.addIssue({
        code: "custom",
        params: {
          errorType: CustomErrorType.INVALID_POSTAL_CODE,
        },
      });
    }
  });
