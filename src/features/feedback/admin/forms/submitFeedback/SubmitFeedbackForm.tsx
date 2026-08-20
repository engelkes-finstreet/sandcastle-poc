"use client";

import { ConfirmFeedbackModal } from "@/features/feedback/admin/modals/ConfirmFeedbackModal/ConfirmFeedbackModal";
import { SubmitFeedbackFormFields } from "@/features/feedback/admin/forms/submitFeedback/SubmitFeedbackFormFields";
import { useSubmitFeedbackFormConfig } from "@/features/feedback/admin/forms/submitFeedback/useSubmitFeedbackFormConfig";
import { Form } from "@/shared/components/form/Form";
import { Box } from "@styled-system/jsx";
import { useRef } from "react";

type SubmitFeedbackFormProps = {
  onSubmitted: () => void;
};

export const SubmitFeedbackForm = ({
  onSubmitted,
}: SubmitFeedbackFormProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const config = useSubmitFeedbackFormConfig({ onSubmitted });

  /**
   * The confirmation modal renders in a Portal, so its confirm button cannot be
   * a submit button of the form. Submitting the rendered form element instead
   * keeps the library's submit path — validation, error banner and success
   * action — intact.
   */
  const onConfirm = () => {
    containerRef.current?.querySelector("form")?.requestSubmit();
  };

  return (
    <Box ref={containerRef}>
      <Form formConfig={config}>
        <SubmitFeedbackFormFields fieldNames={config.fieldNames} />
        <ConfirmFeedbackModal onConfirm={onConfirm} />
      </Form>
    </Box>
  );
};
