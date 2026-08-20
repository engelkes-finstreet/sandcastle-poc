"use client";

import { useFormContext } from "@finstreet/forms/rhf";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { Button } from "@finstreet/ui/components/base/Button";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Typography } from "@finstreet/ui/components/base/Typography";
import {
  Modal,
  ModalActions,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { useExtracted } from "next-intl";
import { useState, useTransition } from "react";

import { HStack, VStack } from "@styled-system/jsx";

import { useFeedbackCategoryOptions } from "@/features/feedback/fsp/forms/submitFeedback/options/useFeedbackCategoryOptions";
import { submitFeedbackFormAction } from "@/features/feedback/fsp/forms/submitFeedback/submitFeedbackFormAction";
import {
  submitFeedbackSchema,
  SubmitFeedbackType,
} from "@/features/feedback/fsp/forms/submitFeedback/submitFeedbackSchema";

import { useConfirmFeedbackModal } from "./store";

type ConfirmFeedbackModalProps = {
  onConfirmed: () => void;
};

export const ConfirmFeedbackModal = ({
  onConfirmed,
}: ConfirmFeedbackModalProps) => {
  const t = useExtracted();
  const { isOpen, setIsOpen } = useConfirmFeedbackModal();
  const { getValues, watch } = useFormContext<SubmitFeedbackType>();
  const categoryOptions = useFeedbackCategoryOptions();
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);

  const subject = watch("subject");
  const category = watch("category");
  const categoryLabel = categoryOptions.find(
    (option) => option.value === category,
  )?.label;

  const handleConfirm = () => {
    setHasError(false);

    startTransition(async () => {
      const parsedValues = submitFeedbackSchema.safeParse(getValues());

      if (!parsedValues.success) {
        setHasError(true);
        return;
      }

      const state = await submitFeedbackFormAction(null, parsedValues.data);

      if (state?.error) {
        setHasError(true);
        return;
      }

      setIsOpen(false);
      onConfirmed();
    });
  };

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>
        <VStack gap={1} alignItems={"flex-start"}>
          <Headline>{t("Feedback absenden?")}</Headline>
          <Typography color={"text.dark"}>
            {t(
              "Bitte prüfen Sie Ihre Angaben. Nach dem Absenden können Sie das Feedback nicht mehr ändern.",
            )}
          </Typography>
        </VStack>
      </ModalTitle>
      <ModalContent>
        <VStack gap={4} alignItems={"stretch"}>
          <VStack gap={1} alignItems={"flex-start"}>
            <Typography fontWeight={"bold"}>{t("Betreff")}</Typography>
            <Typography as={"p"}>{subject}</Typography>
          </VStack>
          <VStack gap={1} alignItems={"flex-start"}>
            <Typography fontWeight={"bold"}>{t("Kategorie")}</Typography>
            <Typography as={"p"}>{categoryLabel}</Typography>
          </VStack>
          {hasError ? (
            <Banner type={"error"}>
              {t("Beim Absenden des Feedbacks ist ein Fehler aufgetreten.")}
            </Banner>
          ) : null}
        </VStack>
      </ModalContent>
      <ModalActions>
        <HStack justifyContent={"space-between"} width={"100%"}>
          <Button
            type={"button"}
            variant={"text"}
            onClick={() => setIsOpen(false)}
          >
            {t("Abbrechen")}
          </Button>
          <Button type={"button"} loading={isPending} onClick={handleConfirm}>
            {t("Absenden")}
          </Button>
        </HStack>
      </ModalActions>
    </Modal>
  );
};
