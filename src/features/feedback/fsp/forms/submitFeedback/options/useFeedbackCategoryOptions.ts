"use client";

import { useExtracted } from "next-intl";

import { FeedbackCategory } from "../submitFeedbackSchema";

export function useFeedbackCategoryOptions() {
  const t = useExtracted();

  return [
    { label: t("Fehler"), value: FeedbackCategory.BUG },
    { label: t("Verbesserung"), value: FeedbackCategory.IMPROVEMENT },
    { label: t("Sonstiges"), value: FeedbackCategory.OTHER },
  ];
}
