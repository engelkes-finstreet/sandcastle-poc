"use client";

import { Form } from "@/shared/components/form/Form";

import { ConfirmFeedbackModal } from "../../modals/ConfirmFeedbackModal/ConfirmFeedbackModal";
import { getSubmitFeedbackDefaultValues } from "./getSubmitFeedbackDefaultValues";
import { SubmitFeedbackFormFields } from "./SubmitFeedbackFormFields";
import { useSubmitFeedbackFormConfig } from "./useSubmitFeedbackFormConfig";

type SubmitFeedbackFormProps = {
  onSuccess: () => void;
};

export const SubmitFeedbackForm = ({ onSuccess }: SubmitFeedbackFormProps) => {
  const defaultValues = getSubmitFeedbackDefaultValues();
  const config = useSubmitFeedbackFormConfig(defaultValues, { onSuccess });

  return (
    <Form formConfig={config}>
      <SubmitFeedbackFormFields fieldNames={config.fieldNames} />
      <ConfirmFeedbackModal onConfirmed={onSuccess} />
    </Form>
  );
};
