import { CustomErrorType } from "@/i18n/useTranslatedError";
import * as z from "@/lib/zod";

// Helper function for zip code validation
export const RequiredCheckboxValidationSchema = z
  .boolean()
  .superRefine((value, ctx) => {
    if (!value) {
      ctx.addIssue({
        code: "custom",
        params: {
          errorType: CustomErrorType.REQUIRED_CHECKBOX,
        },
      });
    }
  });
