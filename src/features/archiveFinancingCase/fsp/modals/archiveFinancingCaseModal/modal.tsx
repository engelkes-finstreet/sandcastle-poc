"use client";

import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useArchiveFinancingCaseModal } from "./store";
import { useExtracted } from "next-intl";
import { Center, VStack } from "@styled-system/jsx";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Suspense } from "react";
import { Spinner } from "@finstreet/ui/components/base/Spinner";
import { ArchiveFinancingCaseForm } from "@/features/archiveFinancingCase/fsp/forms/archiveFinancingCaseForm/ArchiveFinancingCaseForm";

export const ArchiveFinancingCaseModal = () => {
  const { isOpen, setIsOpen, data } = useArchiveFinancingCaseModal();
  const t = useExtracted();

  if (!data) {
    return null;
  }

  const { financingCaseId } = data;

  return (
    <Modal
      open={isOpen}
      onClose={() => {
        setIsOpen(false);
      }}
      css={{
        overflow: "visible",
        "& .modal-children-wrapper": { overflow: "visible" },
      }}
    >
      <ModalTitle>
        <VStack gap={1} alignItems={"flex-start"}>
          <Headline>{t("Anfrage archivieren")}</Headline>
          <Typography color={"text.dark"}>
            {t("Anfrage Nr. {financingCaseId}", {
              financingCaseId: financingCaseId.slice(0, 8),
            })}
          </Typography>
        </VStack>
      </ModalTitle>
      <ModalContent>
        <Suspense
          fallback={
            <Center>
              <Spinner />
            </Center>
          }
        >
          <ArchiveFinancingCaseForm financingCaseId={financingCaseId} />
        </Suspense>
      </ModalContent>
    </Modal>
  );
};
