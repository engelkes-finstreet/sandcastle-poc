import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";
import { SubmitFeedbackType } from "@/features/feedback/forms/submitFeedback/submitFeedbackSchema";
import { useFeedbackCategoryOptions } from "@/features/feedback/forms/submitFeedback/options/useFeedbackCategoryOptions";

export function useSubmitFeedbackFormFields(): FormFieldsType<SubmitFeedbackType> {
  const t = useExtracted();
  const feedbackCategoryOptions = useFeedbackCategoryOptions();

  return {
    subject: {
      type: "input",
      label: t("Betreff"),
    },
    category: {
      type: "select",
      label: t("Kategorie"),
      items: feedbackCategoryOptions,
    },
    message: {
      type: "textarea",
      label: t("Nachricht"),
    },
    responseRequested: {
      type: "checkbox",
      label: t("Rückmeldung erwünscht"),
    },
  };
}
