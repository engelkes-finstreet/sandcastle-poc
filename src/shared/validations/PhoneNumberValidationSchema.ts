import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js/max";
import * as z from "@/lib/zod";
import { CustomErrorType } from "@/i18n/useTranslatedError";

export const PhoneNumberValidationSchema = z
  .trimmedString()
  .superRefine((phone, ctx) => {
    const validate = () => {
      try {
        // Try to parse as international format
        const phoneNumber = parsePhoneNumberFromString(phone);
        if (phoneNumber) {
          // Check if the number is valid
          if (!phoneNumber.isValid()) {
            return false;
          }

          const numberType = phoneNumber.getType();

          // Only accept landline, mobile, or numbers that could be either
          return (
            numberType === "FIXED_LINE" ||
            numberType === "MOBILE" ||
            numberType === "FIXED_LINE_OR_MOBILE"
          );
        }

        // If parsing fails, try with default German format
        // Note: This won't be able to check the type
        return isValidPhoneNumber(phone, "DE");
      } catch (_error) {
        return false;
      }
    };

    const isValid = validate();
    if (!isValid) {
      ctx.addIssue({
        code: "custom",
        params: {
          errorType: CustomErrorType.INVALID_PHONE_NUMBER,
        },
      });
    }
  });
