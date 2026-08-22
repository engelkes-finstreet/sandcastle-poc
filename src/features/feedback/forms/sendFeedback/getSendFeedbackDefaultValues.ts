import { SendFeedbackDefaultValues } from "@/features/feedback/forms/sendFeedback/sendFeedbackSchema";

export function getSendFeedbackDefaultValues(): SendFeedbackDefaultValues {
  return {
    subject: "",
    category: undefined,
    message: "",
    responseRequested: false,
  };
}
