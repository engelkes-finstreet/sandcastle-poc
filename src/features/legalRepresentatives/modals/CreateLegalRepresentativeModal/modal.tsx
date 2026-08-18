"use client";

import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { useCreateLegalRepresentativeModal } from "./store";
import { CreateLegalRepresentativeForm } from "@/features/legalRepresentatives/forms/create/CreateLegalRepresentativeForm";
import { useExtracted } from "next-intl";

export const CreateLegalRepresentativeModal = () => {
  const { isOpen, data, setIsOpen } = useCreateLegalRepresentativeModal();
  const t = useExtracted();

  if (!data) {
    return null;
  }

  const { financingCaseId } = data;

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>{t("Vertretungsberechtigte Person anlegen")}</ModalTitle>
      <ModalContent>
        <CreateLegalRepresentativeForm financingCaseId={financingCaseId} />
      </ModalContent>
    </Modal>
  );
};
