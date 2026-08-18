"use client";

import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { useDeleteUserModal } from "./store";
import { useExtracted } from "next-intl";
import { RevokeMemberForm } from "@/features/members/fsp/forms/revokeMemberForm";
import { VStack } from "@styled-system/jsx";
import { Typography } from "@finstreet/ui/components/base/Typography";

export const DeleteUserModal = () => {
  const { isOpen, data, setIsOpen } = useDeleteUserModal();
  const t = useExtracted();

  if (!data) {
    return null;
  }

  const { membershipId, name, email } = data;

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>{t("Benutzer löschen")}</ModalTitle>
      <ModalContent>
        <VStack alignItems="stretch" gap={2}>
          <Typography>
            {t(
              "Möchten Sie den Benutzer {name} ({email}) wirklich aus Ihrem Unternehmen entfernen?",
              { name, email },
            )}
          </Typography>
          <Typography>
            {t(
              "Der Benutzer verliert Zugriff auf alle Anträge und kann nicht länger auf diese Daten zugreifen",
            )}
          </Typography>
        </VStack>
        <RevokeMemberForm membershipId={membershipId} portal={"customer"} />
      </ModalContent>
    </Modal>
  );
};
