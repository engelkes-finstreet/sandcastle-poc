import { CustomErrorType } from "@/i18n/useTranslatedError";
import dayjs from "dayjs";
import * as z from "@/lib/zod";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export const FutureDateValidationSchema = z
  .trimmedString()
  .superRefine((value, ctx) => {
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

    if (!parsedDate.isBefore(dayjs())) {
      ctx.addIssue({
        code: "custom",
        params: {
          errorType: CustomErrorType.PROHIBITED_FUTURE_DATE,
        },
      });
    }
  });
