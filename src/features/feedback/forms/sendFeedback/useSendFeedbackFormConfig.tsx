"use client";

import { getSendFeedbackDefaultValues } from "@/features/feedback/forms/sendFeedback/getSendFeedbackDefaultValues";
import { sendFeedbackFormAction } from "@/features/feedback/forms/sendFeedback/sendFeedbackFormAction";
import {
  sendFeedbackSchema,
  SendFeedbackFormConfig,
  SendFeedbackFormState,
} from "@/features/feedback/forms/sendFeedback/sendFeedbackSchema";
import { useSendFeedbackFormFields } from "@/features/feedback/forms/sendFeedback/useSendFeedbackFormFields";
import { SendFeedbackModal } from "@/features/feedback/modals/sendFeedback/SendFeedbackModal";
import { useSendFeedbackModal } from "@/features/feedback/modals/sendFeedback/store";
import { ValidatedSubmitButton } from "@/shared/components/ValidatedSubmitButton/ValidatedSubmitButton";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { HStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { useRef } from "react";

type Props = {
  onSuccess: () => void;
};

export function useSendFeedbackFormConfig({
  onSuccess,
}: Props): SendFeedbackFormConfig {
  const t = useExtracted();
  const fields = useSendFeedbackFormFields();
  const { setIsOpen } = useSendFeedbackModal();
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  return {
    fields,
    defaultValues: getSendFeedbackDefaultValues(),
    schema: sendFeedbackSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: sendFeedbackFormAction,
    useErrorAction: () => {
      return (formState: SendFeedbackFormState) => {
        console.error(formState?.error);
        setIsOpen(false);
      };
    },
    useSuccessAction: () => {
      return () => {
        setIsOpen(false);
        onSuccess();
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <>
          <HStack mt={12} justifyContent={"flex-end"}>
            <ValidatedSubmitButton
              label={t("Feedback absenden")}
              loading={isPending}
              onValidationSuccess={() => setIsOpen(true)}
            />
          </HStack>
          {/*
            The modal is rendered through a portal and therefore lives outside
            the <form> element, so its confirm button cannot submit the form on
            its own. It clicks this submit button instead.
          */}
          <button ref={submitButtonRef} type={"submit"} hidden />
          <SendFeedbackModal
            isPending={isPending}
            onConfirm={() => submitButtonRef.current?.click()}
          />
        </>
      );
    },
  };
}
