import { useExtracted } from "next-intl";

export enum FeedbackCategoryOptions {
  BUG = "bug",
  IMPROVEMENT = "improvement",
  OTHER = "other",
}

export function useFeedbackCategoryOptions() {
  const t = useExtracted();

  return [
    { label: t("Fehler"), value: FeedbackCategoryOptions.BUG },
    { label: t("Verbesserung"), value: FeedbackCategoryOptions.IMPROVEMENT },
    { label: t("Sonstiges"), value: FeedbackCategoryOptions.OTHER },
  ];
}
