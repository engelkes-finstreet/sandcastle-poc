import { SubmitFeedbackDefaultValues } from "@/features/feedback/admin/forms/submitFeedback/submitFeedbackSchema";

export function getSubmitFeedbackDefaultValues(): SubmitFeedbackDefaultValues {
  return {
    subject: "",
    category: undefined,
    message: "",
    responseRequested: false,
  };
}
