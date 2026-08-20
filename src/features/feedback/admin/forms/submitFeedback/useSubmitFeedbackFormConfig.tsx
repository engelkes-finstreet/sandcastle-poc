"use client";

import { getSubmitFeedbackDefaultValues } from "@/features/feedback/admin/forms/submitFeedback/getSubmitFeedbackDefaultValues";
import { SubmitFeedbackFormActions } from "@/features/feedback/admin/forms/submitFeedback/SubmitFeedbackFormActions";
import { submitFeedbackFormAction } from "@/features/feedback/admin/forms/submitFeedback/submitFeedbackFormAction";
import {
  submitFeedbackSchema,
  SubmitFeedbackFormConfig,
} from "@/features/feedback/admin/forms/submitFeedback/submitFeedbackSchema";
import { useSubmitFeedbackFormFields } from "@/features/feedback/admin/forms/submitFeedback/useSubmitFeedbackFormFields";
import { useConfirmFeedbackModal } from "@/features/feedback/admin/modals/ConfirmFeedbackModal/store";
import { createFormFieldNames } from "@finstreet/forms/lib";

type UseSubmitFeedbackFormConfigProps = {
  onSubmitted: () => void;
};

export function useSubmitFeedbackFormConfig({
  onSubmitted,
}: UseSubmitFeedbackFormConfigProps): SubmitFeedbackFormConfig {
  const fields = useSubmitFeedbackFormFields();
  const { setIsOpen, setIsPending } = useConfirmFeedbackModal();

  return {
    fields,
    defaultValues: getSubmitFeedbackDefaultValues(),
    schema: submitFeedbackSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: submitFeedbackFormAction,
    useErrorAction: () => {
      return () => {
        setIsOpen(false);
        setIsPending(false);
      };
    },
    useSuccessAction: () => {
      return () => {
        setIsOpen(false);
        setIsPending(false);
        onSubmitted();
      };
    },
    renderFormActions: (isPending: boolean) => {
      return <SubmitFeedbackFormActions isPending={isPending} />;
    },
  };
}
