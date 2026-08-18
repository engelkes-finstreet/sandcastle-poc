"use client";

import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useAnonymizeFinancingCaseModal } from "./store";
import { useExtracted } from "next-intl";
import { AnonymizeFinancingCaseForm } from "@/features/anonymizeFinancingCase/fsp/forms/anonymizeFinancingCaseForm/AnonymizeFinancingCaseForm";

export const AnonymizeFinancingCaseModal = () => {
  const { isOpen, setIsOpen, data } = useAnonymizeFinancingCaseModal();
  const t = useExtracted();

  if (!data) {
    return null;
  }

  const { financingCaseId } = data;

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>{t("Fall anonymisieren")}</ModalTitle>
      <ModalContent>
        <Typography>
          {t(
            "Möchten Sie diesen Fall wirklich anonymisieren? Diese Aktion kann nicht mehr rückgängig gemacht werden.",
          )}
        </Typography>
        <AnonymizeFinancingCaseForm financingCaseId={financingCaseId} />
      </ModalContent>
    </Modal>
  );
};
