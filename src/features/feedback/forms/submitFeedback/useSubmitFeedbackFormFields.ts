import { useFeedbackCategoryOptions } from "@/features/feedback/forms/submitFeedback/options/useFeedbackCategoryOptions";
import { SubmitFeedbackFormType } from "@/features/feedback/forms/submitFeedback/submitFeedbackSchema";
import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";

export function useSubmitFeedbackFormFields(): FormFieldsType<SubmitFeedbackFormType> {
  const t = useExtracted();
  const categoryOptions = useFeedbackCategoryOptions();

  return {
    subject: {
      type: "input",
      label: t("Betreff"),
      caption: t("Maximal 80 Zeichen"),
    },
    category: {
      type: "select",
      label: t("Kategorie"),
      placeholder: t("Bitte auswählen"),
      items: categoryOptions,
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
        "Wir melden uns bei Ihnen, sobald wir Ihr Feedback bearbeitet haben.",
      ),
    },
  };
}
