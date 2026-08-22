"use client";

import { SendFeedbackFormFields } from "@/features/feedback/forms/sendFeedback/SendFeedbackFormFields";
import { useSendFeedbackFormConfig } from "@/features/feedback/forms/sendFeedback/useSendFeedbackFormConfig";
import { Form } from "@/shared/components/form/Form";

type SendFeedbackFormProps = {
  onSuccess: () => void;
};

export const SendFeedbackForm = ({ onSuccess }: SendFeedbackFormProps) => {
  const config = useSendFeedbackFormConfig({ onSuccess });

  return (
    <Form formConfig={config}>
      <SendFeedbackFormFields fieldNames={config.fieldNames} />
    </Form>
  );
};
