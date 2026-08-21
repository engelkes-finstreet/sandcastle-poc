"use client";

import {
  Modal,
  ModalActions,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import {
  DescriptionsList,
  DescriptionsListDetails,
  DescriptionsListTerm,
} from "@finstreet/ui/components/patterns/DescriptionsList";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { Button } from "@finstreet/ui/components/base/Button";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { HStack, VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { useState, useTransition } from "react";
import { useConfirmFeedbackSubmissionModal } from "@/features/feedback/modals/confirmFeedbackSubmission/store";
import { confirmFeedbackSubmissionAction } from "@/features/feedback/modals/confirmFeedbackSubmission/confirmFeedbackSubmissionAction";
import { useFeedbackCategoryOptions } from "@/features/feedback/forms/submitFeedback/options/useFeedbackCategoryOptions";

export const ConfirmFeedbackSubmissionModal = () => {
  const { isOpen, data, setIsOpen, markAsSubmitted } =
    useConfirmFeedbackSubmissionModal();
  const t = useExtracted();
  const feedbackCategoryOptions = useFeedbackCategoryOptions();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<boolean>(false);

  if (!data) {
    return null;
  }

  const { subject, category } = data;
  const categoryLabel =
    feedbackCategoryOptions.find((option) => option.value === category)
      ?.label ?? category;

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await confirmFeedbackSubmissionAction(data);

      if (result.success) {
        markAsSubmitted();
      } else {
        setError(true);
      }
    });
  };

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>{t("Feedback absenden?")}</ModalTitle>
      <ModalContent>
        <VStack gap={6} alignItems={"stretch"}>
          <Typography as={"p"}>
            {t(
              "Bitte prüfen Sie Ihre Angaben. Nach dem Absenden erhält das interne Team Ihr Feedback.",
            )}
          </Typography>
          <DescriptionsList>
            <DescriptionsListTerm>{t("Betreff")}</DescriptionsListTerm>
            <DescriptionsListDetails>{subject}</DescriptionsListDetails>

            <DescriptionsListTerm>{t("Kategorie")}</DescriptionsListTerm>
            <DescriptionsListDetails>{categoryLabel}</DescriptionsListDetails>
          </DescriptionsList>
          {error ? (
            <Banner type="error">
              {t("Beim Absenden des Feedbacks ist ein Fehler aufgetreten.")}
            </Banner>
          ) : null}
        </VStack>
      </ModalContent>
      <ModalActions>
        <HStack justifyContent={"space-between"} width={"100%"}>
          <Button variant={"text"} onClick={() => setIsOpen(false)}>
            {t("Abbrechen")}
          </Button>
          <Button loading={isPending} onClick={handleConfirm}>
            {t("Absenden")}
          </Button>
        </HStack>
      </ModalActions>
    </Modal>
  );
};
