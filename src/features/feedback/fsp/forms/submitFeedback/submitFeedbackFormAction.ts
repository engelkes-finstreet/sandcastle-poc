"use server";

import {
  SubmitFeedbackFormState,
  SubmitFeedbackOutputType,
} from "./submitFeedbackSchema";

export async function submitFeedbackFormAction(
  state: SubmitFeedbackFormState,
  formData: SubmitFeedbackOutputType,
): Promise<SubmitFeedbackFormState> {
  console.info("Internal feedback received", {
    subject: formData.subject,
    category: formData.category,
    message: formData.message,
    responseRequested: formData.responseRequested,
  });

  return {
    error: null,
    message: null,
  };
}
