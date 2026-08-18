"use client";

import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { useAddSubstituteModal } from "./store";
import { useExtracted } from "next-intl";
import { AssignSubstituteForm } from "../../forms/assignSubstitute/AssignSubstituteForm";

export const AddSubstituteModal = () => {
  const { isOpen, closeModal } = useAddSubstituteModal();
  const t = useExtracted();

  return (
    <Modal
      open={isOpen}
      onClose={closeModal}
      css={{
        overflow: "visible",
        "& .modal-children-wrapper": { overflow: "visible" },
      }}
    >
      <ModalTitle>{t("Vertretung ernennen")}</ModalTitle>
      <ModalContent>
        <AssignSubstituteForm />
      </ModalContent>
    </Modal>
  );
};
