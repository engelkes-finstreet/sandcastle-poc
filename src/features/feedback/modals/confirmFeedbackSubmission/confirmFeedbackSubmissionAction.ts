"use server";

import {
  submitFeedbackConfirmationSchema,
  SubmitFeedbackConfirmation,
} from "@/features/feedback/forms/submitFeedback/submitFeedbackSchema";

type ConfirmFeedbackSubmissionResult = {
  success: boolean;
};

/**
 * Completes the feedback submission once the user confirmed the staged fields.
 * There is no backend endpoint yet, so the action only re-validates the payload.
 */
export async function confirmFeedbackSubmissionAction(
  confirmation: SubmitFeedbackConfirmation,
): Promise<ConfirmFeedbackSubmissionResult> {
  const parseResult = submitFeedbackConfirmationSchema.safeParse(confirmation);

  return { success: parseResult.success };
}
