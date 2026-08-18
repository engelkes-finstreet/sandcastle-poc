"use client";

import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { useInviteMemberModal } from "./store";
import { useExtracted } from "next-intl";
import { InviteMemberForm } from "@/features/members/fsp/forms/memberForm/inviteMember/InviteMemberForm";

export const InviteMemberModal = () => {
  const { isOpen, setIsOpen, data } = useInviteMemberModal();
  const t = useExtracted();

  if (!data) {
    return null;
  }

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>{t("Neue Benutzer einladen")}</ModalTitle>
      <ModalContent>
        <InviteMemberForm
          departments={data.departments}
          signingGroups={data.signingGroups}
        />
      </ModalContent>
    </Modal>
  );
};
