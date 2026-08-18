"use client";

import { Typography } from "@finstreet/ui/components/base/Typography";
import { VStack } from "@styled-system/jsx";
import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { useResendInvitationModal } from "@/features/members/common/modals/ResendInvitationModal/store";
import { ResendInvitationForm } from "@/features/members/common/forms/resendInvitationForm";
import { useExtracted } from "next-intl";

export const ResendInvitationModal = () => {
  const { isOpen, data, setIsOpen } = useResendInvitationModal();
  const t = useExtracted();

  if (!data) {
    return null;
  }

  const { invitationId, memberEmail, memberName } = data;

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>{t("Einladung erneut senden")}</ModalTitle>
      <ModalContent>
        <VStack gap={4} w="full" alignItems="stretch">
          <Typography as="p">
            {t("Möchten Sie die Einladung an {userName} erneut senden?", {
              userName: memberName,
            })}
          </Typography>
          <Typography as="p">
            {t(
              "Die Einladung wird an die E-Mail-Adresse {email} erneut gesendet.",
              { email: memberEmail },
            )}
          </Typography>
        </VStack>
        <ResendInvitationForm invitationId={invitationId} />
      </ModalContent>
    </Modal>
  );
};
