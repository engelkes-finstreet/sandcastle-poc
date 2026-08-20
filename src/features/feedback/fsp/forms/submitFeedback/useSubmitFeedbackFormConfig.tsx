"use client";

import { createFormFieldNames } from "@finstreet/forms/lib";

import { HStack } from "@styled-system/jsx";

import { OpenConfirmFeedbackModalButton } from "../../modals/ConfirmFeedbackModal/OpenConfirmFeedbackModalButton";
import { submitFeedbackFormAction } from "./submitFeedbackFormAction";
import {
  SubmitFeedbackDefaultValues,
  SubmitFeedbackFormConfig,
  SubmitFeedbackFormState,
  submitFeedbackSchema,
} from "./submitFeedbackSchema";
import { useSubmitFeedbackFormFields } from "./useSubmitFeedbackFormFields";

type UseSubmitFeedbackFormConfigParams = {
  onSuccess: () => void;
};

export function useSubmitFeedbackFormConfig(
  defaultValues: SubmitFeedbackDefaultValues,
  { onSuccess }: UseSubmitFeedbackFormConfigParams,
): SubmitFeedbackFormConfig {
  const fields = useSubmitFeedbackFormFields();

  return {
    fields,
    defaultValues,
    schema: submitFeedbackSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: submitFeedbackFormAction,
    useErrorAction: () => {
      return (formState: SubmitFeedbackFormState) => {
        console.error(formState?.error);
      };
    },
    useSuccessAction: () => {
      return () => {
        onSuccess();
      };
    },
    renderFormActions: () => {
      return (
        <HStack mt={12} justifyContent={"flex-end"}>
          <OpenConfirmFeedbackModalButton />
        </HStack>
      );
    },
  };
}
