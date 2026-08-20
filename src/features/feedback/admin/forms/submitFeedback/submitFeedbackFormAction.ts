"use server";

import {
  submitFeedbackSchema,
  SubmitFeedbackFormOutputType,
  SubmitFeedbackFormState,
} from "@/features/feedback/admin/forms/submitFeedback/submitFeedbackSchema";
import { getExtracted } from "next-intl/server";

export async function submitFeedbackFormAction(
  _state: SubmitFeedbackFormState,
  formData: SubmitFeedbackFormOutputType,
): Promise<SubmitFeedbackFormState> {
  const t = await getExtracted();
  const parsedFeedback = submitFeedbackSchema.safeParse(formData);

  if (!parsedFeedback.success) {
    return {
      error: t(
        "Das Feedback konnte nicht übermittelt werden. Bitte prüfen Sie Ihre Eingaben.",
      ),
      message: null,
    };
  }

  return {
    error: null,
    message: null,
  };
}
