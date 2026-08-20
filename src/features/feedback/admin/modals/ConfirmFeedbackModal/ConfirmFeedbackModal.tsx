"use client";

import { useFeedbackCategoryOptions } from "@/features/feedback/admin/forms/submitFeedback/options/useFeedbackCategoryOptions";
import { SubmitFeedbackFormType } from "@/features/feedback/admin/forms/submitFeedback/submitFeedbackSchema";
import { useConfirmFeedbackModal } from "@/features/feedback/admin/modals/ConfirmFeedbackModal/store";
import { useFinstreetFormContext } from "@finstreet/forms";
import { useWatch } from "@finstreet/forms/rhf";
import { Button } from "@finstreet/ui/components/base/Button";
import { Typography } from "@finstreet/ui/components/base/Typography";
import {
  Modal,
  ModalActions,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { HStack, VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";

type ConfirmFeedbackModalProps = {
  onConfirm: () => void;
};

export const ConfirmFeedbackModal = ({
  onConfirm,
}: ConfirmFeedbackModalProps) => {
  const t = useExtracted();
  const { isOpen, isPending, setIsOpen } = useConfirmFeedbackModal();
  const categoryOptions = useFeedbackCategoryOptions();
  const { control } = useFinstreetFormContext<SubmitFeedbackFormType>();

  const [subject, category] = useWatch({
    control,
    name: ["subject", "category"],
  });

  const categoryLabel = categoryOptions.find(
    (option) => option.value === category,
  )?.label;

  return (
    <Modal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      css={{ maxWidth: "600px!" }}
    >
      <ModalTitle>{t("Feedback absenden?")}</ModalTitle>
      <ModalContent>
        <VStack gap={6} alignItems={"stretch"}>
          <Typography as={"p"}>
            {t(
              "Bitte prüfen Sie Ihre Angaben. Nach dem Absenden können Sie das Feedback nicht mehr ändern.",
            )}
          </Typography>

          <VStack gap={4} alignItems={"stretch"}>
            <VStack gap={1} alignItems={"flex-start"}>
              <Typography fontSize={"s"} color={"text.dark"}>
                {t("Betreff")}
              </Typography>
              <Typography fontWeight={"bold"}>{subject}</Typography>
            </VStack>

            <VStack gap={1} alignItems={"flex-start"}>
              <Typography fontSize={"s"} color={"text.dark"}>
                {t("Kategorie")}
              </Typography>
              <Typography fontWeight={"bold"}>{categoryLabel}</Typography>
            </VStack>
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
