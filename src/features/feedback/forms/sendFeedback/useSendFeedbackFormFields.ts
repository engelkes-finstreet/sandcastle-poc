import { SendFeedbackType } from "@/features/feedback/forms/sendFeedback/sendFeedbackSchema";
import { useFeedbackCategoryOptions } from "@/features/feedback/forms/sendFeedback/options/useFeedbackCategoryOptions";
import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";

export function useSendFeedbackFormFields(): FormFieldsType<SendFeedbackType> {
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
      caption: t("Mindestens 20, maximal 1.000 Zeichen"),
    },
    responseRequested: {
      type: "checkbox",
      label: t("Rückmeldung erwünscht"),
    },
  };
}
