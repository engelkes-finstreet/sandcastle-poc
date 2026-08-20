"use client";

import { useFormContext } from "@finstreet/forms/rhf";
import { Button } from "@finstreet/ui/components/base/Button";
import { useExtracted } from "next-intl";

import { SubmitFeedbackType } from "@/features/feedback/fsp/forms/submitFeedback/submitFeedbackSchema";

import { useConfirmFeedbackModal } from "./store";

export const OpenConfirmFeedbackModalButton = () => {
  const t = useExtracted();
  const { trigger } = useFormContext<SubmitFeedbackType>();
  const { setIsOpen } = useConfirmFeedbackModal();

  const handleClick = async () => {
    const isValid = await trigger();

    if (isValid) {
      setIsOpen(true);
    }
  };

  return (
    <Button type={"button"} onClick={handleClick}>
      {t("Feedback absenden")}
    </Button>
  );
};
