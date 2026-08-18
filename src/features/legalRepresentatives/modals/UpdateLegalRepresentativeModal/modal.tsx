"use client";

import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { useUpdateLegalRepresentativeModal } from "./store";
import { UpdateLegalRepresentativeForm } from "@/features/legalRepresentatives/forms/update/UpdateLegalRepresentativeForm";
import { useExtracted } from "next-intl";

export const UpdateLegalRepresentativeModal = () => {
  const { isOpen, data, setIsOpen } = useUpdateLegalRepresentativeModal();
  const t = useExtracted();

  if (!data) {
    return null;
  }

  const { financingCaseId, legalRepresentativeDefaultValues } = data;

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>{t("Vertretungsberechtigte Person bearbeiten")}</ModalTitle>
      <ModalContent>
        <UpdateLegalRepresentativeForm
          financingCaseId={financingCaseId}
          defaultValues={legalRepresentativeDefaultValues}
        />
      </ModalContent>
    </Modal>
  );
};
