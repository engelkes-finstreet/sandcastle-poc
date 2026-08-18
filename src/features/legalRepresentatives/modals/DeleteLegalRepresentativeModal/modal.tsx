"use client";

import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { useDeleteLegalRepresentativeModal } from "./store";
import { DeleteLegalRepresentativeForm } from "@/features/legalRepresentatives/forms/delete/DeleteLegalRepresentativeForm";
import { VStack } from "@styled-system/jsx";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useExtracted } from "next-intl";

export const DeleteLegalRepresentativeModal = () => {
  const { isOpen, data, setIsOpen } = useDeleteLegalRepresentativeModal();
  const t = useExtracted();

  if (!data) {
    return null;
  }

  const { financingCaseId, legalRepresentativeId, name } = data;

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>{t("Vertretungsberechtigte Person löschen")}</ModalTitle>
      <ModalContent>
        <VStack gap={4} alignItems={"stretch"}>
          <Typography>
            {t(
              "Möchten Sie {name} wirklich als vertretungsberechtigte Person löschen?",
              { name },
            )}
          </Typography>
          <DeleteLegalRepresentativeForm
            financingCaseId={financingCaseId}
            legalRepresentativeId={legalRepresentativeId}
          />
        </VStack>
      </ModalContent>
    </Modal>
  );
};
