"use client";

import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";

import { useFeedbackCategoryOptions } from "./options/useFeedbackCategoryOptions";
import { SubmitFeedbackType } from "./submitFeedbackSchema";

export function useSubmitFeedbackFormFields(): FormFieldsType<SubmitFeedbackType> {
  const t = useExtracted();
  const feedbackCategoryOptions = useFeedbackCategoryOptions();

  return {
    subject: {
      type: "input",
      label: t("Betreff"),
      caption: t("Maximal 80 Zeichen"),
    },
    category: {
      type: "select",
      label: t("Kategorie"),
      placeholder: t("Kategorie auswählen"),
      items: feedbackCategoryOptions,
    },
    message: {
      type: "textarea",
      label: t("Nachricht"),
      caption: t("Mindestens 20, maximal 1000 Zeichen"),
    },
    responseRequested: {
      type: "checkbox",
      label: t("Rückmeldung erwünscht"),
      description: t(
        "Wir melden uns per E-Mail bei Ihnen, sobald wir Ihr Feedback bearbeitet haben.",
      ),
    },
  };
}
