"use client";

import { SubmitFeedbackFormType } from "@/features/feedback/admin/forms/submitFeedback/submitFeedbackSchema";
import { useConfirmFeedbackModal } from "@/features/feedback/admin/modals/ConfirmFeedbackModal/store";
import { useFinstreetFormContext } from "@finstreet/forms";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { useEffect } from "react";
import { FaPaperPlane } from "react-icons/fa6";

type SubmitFeedbackFormActionsProps = {
  isPending: boolean;
};

/**
 * The submit button does not submit the form directly: it validates first and
 * only opens the confirmation modal when every field is valid. The actual
 * submission is triggered from inside the modal.
 */
export const SubmitFeedbackFormActions = ({
  isPending,
}: SubmitFeedbackFormActionsProps) => {
  const t = useExtracted();
  const { trigger } = useFinstreetFormContext<SubmitFeedbackFormType>();
  const { setIsOpen, setIsPending } = useConfirmFeedbackModal();

  useEffect(() => {
    setIsPending(isPending);
  }, [isPending, setIsPending]);

  const onValidateAndConfirm = async () => {
    const isValid = await trigger();

    if (isValid) {
      setIsOpen(true);
    }
  };

  return (
    <HStack mt={12} justifyContent={"flex-end"}>
      <Button
        type={"button"}
        icon={<FaPaperPlane />}
        loading={isPending}
        onClick={onValidateAndConfirm}
      >
        {t("Feedback absenden")}
      </Button>
    </HStack>
  );
};
