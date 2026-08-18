"use client";

import { RevokeMemberForm } from "@/features/members/fsp/forms/revokeMemberForm";
import { useRevokeMemberModal } from "@/features/members/fsp/modals/RevokeMemberModal/store";
import { Box, VStack } from "@styled-system/jsx";
import { Banner } from "@finstreet/ui/components/base/Banner";
import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { useExtracted } from "next-intl";

export const RevokeMemberModal = () => {
  const { isOpen, data, setIsOpen } = useRevokeMemberModal();
  const t = useExtracted();

  if (!data) {
    return null;
  }

  const { membershipId, membershipName } = data;

  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <ModalTitle>{t("Benutzer löschen")}</ModalTitle>
      <ModalContent>
        <VStack gap={4} w="full" alignItems="stretch">
          <Box>
            {t.rich(
              '<p>Möchten Sie den Benutzer "<name></name>" wirklich löschen?</p><p>Die laufenden Anfragen werden an die BfW zur weiteren Bearbeitung überführt und können von den Distributoren neu zugewiesen werden.</p>',
              {
                p: (chunks) => <p>{chunks}</p>,
                name: () => <strong>{membershipName}</strong>,
              },
            )}
          </Box>
          <Banner type="warning">
            {t("Dieser Vorgang kann nicht rückgängig gemacht werden.")}
          </Banner>
        </VStack>
        <RevokeMemberForm membershipId={membershipId} portal={"operations"} />
      </ModalContent>
    </Modal>
  );
};
