import { SubmitFeedbackDefaultValues } from "@/features/feedback/forms/submitFeedback/submitFeedbackSchema";

export function getSubmitFeedbackDefaultValues(): SubmitFeedbackDefaultValues {
  return {
    subject: "",
    category: undefined,
    message: "",
    responseRequested: false,
  };
}
