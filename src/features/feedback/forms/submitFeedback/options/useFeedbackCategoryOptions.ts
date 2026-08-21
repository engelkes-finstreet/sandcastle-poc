import { useExtracted } from "next-intl";

export enum FeedbackCategoryOptions {
  BUG = "bug",
  IMPROVEMENT = "improvement",
  QUESTION = "question",
  OTHER = "other",
}

export function useFeedbackCategoryOptions() {
  const t = useExtracted();

  return [
    { label: t("Fehler"), value: FeedbackCategoryOptions.BUG },
    {
      label: t("Verbesserungsvorschlag"),
      value: FeedbackCategoryOptions.IMPROVEMENT,
    },
    { label: t("Frage"), value: FeedbackCategoryOptions.QUESTION },
    { label: t("Sonstiges"), value: FeedbackCategoryOptions.OTHER },
  ];
}
