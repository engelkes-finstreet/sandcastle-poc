import { FeedbackCategory } from "@/features/feedback/forms/submitFeedback/submitFeedbackSchema";
import { useExtracted } from "next-intl";

export type FeedbackCategoryOption = {
  label: string;
  value: FeedbackCategory;
};

export function useFeedbackCategoryOptions(): FeedbackCategoryOption[] {
  const t = useExtracted();

  return [
    { label: t("Fehler"), value: "bug" },
    { label: t("Verbesserung"), value: "improvement" },
    { label: t("Sonstiges"), value: "other" },
  ];
}
