"use server";

import {
  submitFeedbackSchema,
  SubmitFeedbackFormState,
  SubmitFeedbackOutputType,
} from "@/features/feedback/forms/submitFeedback/submitFeedbackSchema";

/**
 * Stages the feedback for confirmation. There is no backend endpoint yet, so the
 * action only validates the input again on the server and hands the fields shown
 * in the confirmation modal back to the client.
 */
export async function submitFeedbackFormAction(
  state: SubmitFeedbackFormState,
  formData: SubmitFeedbackOutputType,
): Promise<SubmitFeedbackFormState> {
  const parseResult = submitFeedbackSchema.safeParse(formData);

  if (!parseResult.success) {
    return {
      error: "Ihre Angaben konnten nicht verarbeitet werden.",
      message: null,
      confirmation: null,
    };
  }

  const { subject, category } = parseResult.data;

  return {
    error: null,
    message: null,
    confirmation: { subject, category },
  };
}
