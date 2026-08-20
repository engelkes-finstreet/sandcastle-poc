import { SubmitFeedbackDefaultValues } from "./submitFeedbackSchema";

export function getSubmitFeedbackDefaultValues() {
  const defaultValues = {
    subject: "",
    category: undefined,
    message: "",
    responseRequested: false,
  } as const satisfies SubmitFeedbackDefaultValues;

  return defaultValues;
}
