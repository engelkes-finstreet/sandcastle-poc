"use server";

import {
  sendFeedbackSchema,
  SendFeedbackFormState,
  SendFeedbackOutputType,
} from "@/features/feedback/forms/sendFeedback/sendFeedbackSchema";
import { getExtracted } from "next-intl/server";

/**
 * There is no backend endpoint for internal feedback yet, so this action only
 * re-validates the submitted values on the server and reports success.
 */
export async function sendFeedbackFormAction(
  state: SendFeedbackFormState,
  formData: SendFeedbackOutputType,
): Promise<SendFeedbackFormState> {
  const result = sendFeedbackSchema.safeParse(formData);

  if (!result.success) {
    const t = await getExtracted();

    return {
      error: t(
        "Das Feedback konnte nicht gesendet werden. Bitte überprüfen Sie Ihre Angaben.",
      ),
      message: null,
    };
  }

  return {
    error: null,
    message: null,
  };
}
