import * as z from "@/lib/zod";
import { useExtracted } from "next-intl";

export function useTranslatedError() {
  const t = useExtracted();

  const error: string | z.core.$ZodErrorMap<z.core.$ZodIssue> = (iss) => {
    switch (iss.code) {
      case "invalid_type":
        if (iss.input === "undefined" || iss.input === "null") {
          return t("Pflichtfeld");
        }
        if (iss.expected === "number") {
          return t("Eine Zahl muss eingegeben werden");
        }
        if (iss.expected === "date") {
          return t("Ungültiges Datum");
        }

        return t("Ungültige Eingabe");
      case "invalid_format":
        if (iss.format === "email") {
          return t("Ungültige E-Mail-Adresse");
        }
        if (iss.format === "url") {
          return t("Ungültige URL");
        }
        return t("Ein Text muss eingegeben werden");
      case "invalid_value":
        if (iss.input === undefined || iss.input === null) {
          return t("Pflichtfeld");
        }
        return t("Ungültige Eingabe");
      case "too_small":
        if (iss.origin === "string") {
          if (iss.minimum === 1) {
            return t("Pflichtfeld");
          }
          return t("Mindestens {min} Zeichen erforderlich", {
            min: iss.minimum.toLocaleString("de-DE"),
          });
        }
        if (iss.origin === "number") {
          return t("Der Wert muss größer sein als {min}", {
            min: iss.minimum.toLocaleString("de-DE"),
          });
        }
        return t("Der Wert ist zu klein");
      case "too_big":
        if (iss.origin === "string") {
          return t("Maximal {max} Zeichen erlaubt", {
            max: iss.maximum.toLocaleString("de-DE"),
          });
        }
        if (iss.origin === "number") {
          return t("Der Wert muss kleiner als {max} sein", {
            max: iss.maximum.toLocaleString("de-DE"),
          });
        }
        return t("Der Wert ist zu groß");
      case "custom":
        if (iss.params && iss.params.errorType) {
          switch (iss.params.errorType) {
            case CustomErrorType.INTERMEDIATOR_NAME_MISMATCH:
              return {
                message: t(
                  "Die Eingabe und der Name des Unternehmens stimmen nicht überein.",
                ),
              };
            case CustomErrorType.INVALID_PHONE_NUMBER:
              return {
                message: t("Bitte geben Sie eine gültige Telefonnummer ein."),
              };
            case CustomErrorType.INVALID_POSTAL_CODE:
              return { message: t("Ungültige Postleitzahl") };
            case CustomErrorType.INVALID_IBAN:
              return {
                message: t(
                  "Bitte geben Sie eine gültige IBAN ohne Leerzeichen an",
                ),
              };
            case CustomErrorType.INVALID_TAX_ID:
              return {
                message: t(
                  'Die Steuernummer darf nur aus Zahlen und "/" bestehen',
                ),
              };
            case CustomErrorType.REQUIRED_CHECKBOX:
              return { message: t("Dieses Feld muss bestätigt werden") };
            case CustomErrorType.INVALID_WORD_COUNT:
              // Could be extended by adding a type to the params to differentiate between too few and too many words
              return {
                message: t("Bitte geben Sie maximal {maxWords} Wörter ein", {
                  maxWords: iss.params.maxWords,
                }),
              };
            case CustomErrorType.INVALID_BIRTH_DATE:
              return { message: t("Ungültiges Geburtsdatum") };
            case CustomErrorType.PROHIBITED_FUTURE_DATE:
              return {
                message: t("Das Datum darf nicht in der Zukunft liegen"),
              };
            case CustomErrorType.MEMBER_ROLE_MISSING:
              return {
                message: t("Es muss mindestens eine Rolle ausgewählt sein"),
              };
            case CustomErrorType.PASSWORD_INVALID:
              return {
                message: t(
                  "Das Passwort muss mindestens 12 Zeichen lang sein und mindestens einen Großbuchstaben, einen Kleinbuchstaben, ein Sonderzeichen und eine Zahl enthalten",
                ),
              };
            case CustomErrorType.INSTITUTIONAL_IDENTIFIER:
              return {
                message: t("Bitte geben Sie ein gültiges IK-Kennzeichen ein."),
              };
            case CustomErrorType.MEASURE_DATES_INVALID:
              return {
                message: t("Das Enddatum muss nach dem Startdatum liegen"),
              };
            case CustomErrorType.DATE_TOO_EARLY:
              return {
                message: t("Das Datum darf nicht vor dem {date} liegen", {
                  date: iss.params.date,
                }),
              };
            case CustomErrorType.DATE_TOO_LATE:
              return {
                message: t("Das Datum darf nicht nach dem {date} liegen", {
                  date: iss.params.date,
                }),
              };
            case CustomErrorType.YEAR_TOO_FAR_IN_FUTURE:
              return {
                message: t("Das Baujahr darf nicht älter als {year} sein", {
                  year: iss.params.year,
                }),
              };
            case CustomErrorType.NO_MESSAGE:
              return { message: "" };
            case CustomErrorType.AT_LEAST_ONE_PURPOSE_IS_REQUIRED:
              return { message: t("Bitte wählen Sie eine Finanzierung aus.") };
            case CustomErrorType.PASSWORD_MISMATCH:
              return { message: t("Die Passwörter stimmen nicht überein.") };
          }
        }

        return { message: t("Ungültige Eingabe") };
      default:
        return t("Ungültige Eingabe");
    }
  };

  return error;
}

export enum CustomErrorType {
  INTERMEDIATOR_NAME_MISMATCH = "intermediatorNameMismatch",
  INVALID_PHONE_NUMBER = "invalidPhoneNumber",
  INVALID_POSTAL_CODE = "invalidPostalCode",
  INVALID_IBAN = "invalidIban",
  INVALID_TAX_ID = "invalidTaxId",
  REQUIRED_CHECKBOX = "requiredCheckbox",
  YEAR_TOO_FAR_IN_FUTURE = "yearTooFarInFuture",
  INVALID_WORD_COUNT = "invalidWordCount",
  INVALID_BIRTH_DATE = "invalidBirthDate",
  PROHIBITED_FUTURE_DATE = "prohibitedFutureDate",
  DATE_TOO_EARLY = "dateTooEarly",
  DATE_TOO_LATE = "dateTooLate",
  MEMBER_ROLE_MISSING = "memberRoleMissing",
  PASSWORD_INVALID = "passwordInvalid",
  INSTITUTIONAL_IDENTIFIER = "institutionalIdentifierInvalid",
  MEASURE_DATES_INVALID = "measureDatesInvalid",
  NO_MESSAGE = "noMessage",
  INVALID_DATE_FORMAT = "invalidDateFormat",
  AT_LEAST_ONE_PURPOSE_IS_REQUIRED = "atLeastOnePurposeIsRequired",
  PASSWORD_MISMATCH = "passwordMismatch",
}
