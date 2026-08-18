"use client";

import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { VStack } from "@styled-system/jsx";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useExtracted } from "next-intl";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { useStopSubstituteModal } from "./store";
import { StopSubstituteSimpleForm } from "@/features/substitutes/fsp/forms/stopSubstitute/StopSubstituteSimpleForm";

export const StopSubstituteModal = () => {
  const { isOpen, closeModal } = useStopSubstituteModal();
  const t = useExtracted();

  return (
    <Modal open={isOpen} onClose={closeModal}>
      <ModalTitle>
        <VStack gap={1} alignItems={"flex-start"}>
          <Headline>{t("Vertretung beenden?")}</Headline>
          <Typography color={"text.dark"}>
            {t("Sind Sie sicher, dass sie die Vertretung beenden wollen?")}
          </Typography>
        </VStack>
      </ModalTitle>
      <ModalContent>
        <StopSubstituteSimpleForm />
      </ModalContent>
    </Modal>
  );
};
