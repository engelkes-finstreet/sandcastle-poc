import dayjs from "dayjs";
import * as z from "@/lib/zod";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { CustomErrorType } from "@/i18n/useTranslatedError";

dayjs.extend(customParseFormat);

export const DateValidationSchema = z
  .trimmedString()
  .superRefine((value, ctx) => {
    if (!value) return;

    const parsedDate = dayjs(value, "YYYY-MM-DD");
    const validFormat = parsedDate.isValid();

    if (!validFormat) {
      ctx.addIssue({
        code: "custom",
        params: {
          errorType: CustomErrorType.INVALID_DATE_FORMAT,
        },
      });
    }
  });
