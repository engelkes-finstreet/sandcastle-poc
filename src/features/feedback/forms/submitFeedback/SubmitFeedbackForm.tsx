"use client";

import { Form } from "@/shared/components/form/Form";
import { useSubmitFeedbackFormConfig } from "@/features/feedback/forms/submitFeedback/useSubmitFeedbackFormConfig";
import { SubmitFeedbackFormFields } from "@/features/feedback/forms/submitFeedback/SubmitFeedbackFormFields";

export const SubmitFeedbackForm = () => {
  const config = useSubmitFeedbackFormConfig();

  return (
    <Form formConfig={config}>
      <SubmitFeedbackFormFields fieldNames={config.fieldNames} />
    </Form>
  );
};
