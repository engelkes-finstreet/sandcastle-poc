"use client";

import { Typography } from "@finstreet/ui/components/base/Typography";
import { VStack } from "@styled-system/jsx";
import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { useWithdrawMemberInvitationModal } from "@/features/members/common/modals/WithdrawInvitationModal/store";
import { useExtracted } from "next-intl";
import { WithdrawInvitationForm } from "@/features/members/common/forms/withdrawInvitaionForm";

export const WithdrawInvitationModal = () => {
  const { isOpen, data, setIsOpen } = useWithdrawMemberInvitationModal();
  const t = useExtracted();

  if (!data) {
    return null;
  }

  const { invitationId, memberEmail, memberName } = data;

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>{t("Einladung zurückziehen")}</ModalTitle>
      <ModalContent>
        <VStack gap={4} w="full" alignItems="stretch">
          <Typography as="p">
            {t.rich(
              "Möchten Sie die Einladung für <name></name> zurückziehen?",
              {
                name: () => <strong>{memberName}</strong>,
              },
            )}
          </Typography>
          <Banner type="warning">
            {t("Die Einladung an {email} wird zurückgezogen.", {
              email: memberEmail,
            })}
          </Banner>
        </VStack>
        <WithdrawInvitationForm invitationId={invitationId} />
      </ModalContent>
    </Modal>
  );
};
