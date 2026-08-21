import { createFormFieldNames } from "@finstreet/forms/lib";
import { useExtracted } from "next-intl";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack } from "@styled-system/jsx";
import { FaArrowRight } from "react-icons/fa6";
import { submitFeedbackFormAction } from "@/features/feedback/forms/submitFeedback/submitFeedbackFormAction";
import {
  submitFeedbackSchema,
  SubmitFeedbackFormConfig,
  SubmitFeedbackFormState,
} from "@/features/feedback/forms/submitFeedback/submitFeedbackSchema";
import { useSubmitFeedbackFormFields } from "@/features/feedback/forms/submitFeedback/useSubmitFeedbackFormFields";
import { useConfirmFeedbackSubmissionModal } from "@/features/feedback/modals/confirmFeedbackSubmission/store";

export function useSubmitFeedbackFormConfig(): SubmitFeedbackFormConfig {
  const t = useExtracted();
  const fields = useSubmitFeedbackFormFields();
  const { setData } = useConfirmFeedbackSubmissionModal();

  return {
    fields,
    defaultValues: {
      subject: "",
      category: undefined,
      message: "",
      responseRequested: false,
    },
    schema: submitFeedbackSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: submitFeedbackFormAction,
    useErrorAction: () => {
      return (formState: SubmitFeedbackFormState) => {
        console.error(formState?.error);
      };
    },
    useSuccessAction: () => {
      return (formState: SubmitFeedbackFormState) => {
        if (formState?.confirmation) {
          setData(formState.confirmation);
        }
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={12} justifyContent={"flex-end"}>
          <Button loading={isPending} type="submit" icon={<FaArrowRight />}>
            {t("Absenden")}
          </Button>
        </HStack>
      );
    },
  };
}
