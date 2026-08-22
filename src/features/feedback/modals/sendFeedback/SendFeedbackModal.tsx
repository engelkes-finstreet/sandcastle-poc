"use client";

import {
  Modal,
  ModalActions,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { useSendFeedbackModal } from "@/features/feedback/modals/sendFeedback/store";
import { SendFeedbackType } from "@/features/feedback/forms/sendFeedback/sendFeedbackSchema";
import { useFeedbackCategoryOptions } from "@/features/feedback/forms/sendFeedback/options/useFeedbackCategoryOptions";
import { Button } from "@finstreet/ui/components/base/Button";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useFormContext, useWatch } from "@finstreet/forms/rhf";
import { HStack, VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";

type SendFeedbackModalProps = {
  isPending: boolean;
  onConfirm: () => void;
};

export const SendFeedbackModal = ({
  isPending,
  onConfirm,
}: SendFeedbackModalProps) => {
  const { isOpen, setIsOpen } = useSendFeedbackModal();
  const t = useExtracted();
  const categoryOptions = useFeedbackCategoryOptions();
  const { control } = useFormContext<SendFeedbackType>();
  const subject = useWatch({ control, name: "subject" });
  const category = useWatch({ control, name: "category" });

  const categoryLabel = categoryOptions.find(
    (option) => option.value === category,
  )?.label;

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>{t("Feedback absenden?")}</ModalTitle>
      <ModalContent>
        <VStack gap={4} alignItems={"stretch"}>
          <Typography>
            {t(
              "Diese Angaben werden an das Produktteam übermittelt. Bitte prüfen Sie sie vor dem Absenden.",
            )}
          </Typography>
          <VStack gap={1} alignItems={"stretch"}>
            <Typography>{t("Betreff: {subject}", { subject })}</Typography>
            <Typography>
              {t("Kategorie: {category}", { category: categoryLabel ?? "" })}
            </Typography>
          </VStack>
        </VStack>
      </ModalContent>
      <ModalActions>
        <HStack justifyContent={"space-between"} width={"100%"}>
          <Button variant={"text"} onClick={() => setIsOpen(false)}>
            {t("Abbrechen")}
          </Button>
          <Button variant={"primary"} loading={isPending} onClick={onConfirm}>
            {t("Absenden")}
          </Button>
        </HStack>
      </ModalActions>
    </Modal>
  );
};
