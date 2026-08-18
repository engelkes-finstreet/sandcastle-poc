"use client";

import {
  Modal,
  ModalContent,
  ModalTitle,
} from "@finstreet/ui/components/patterns/Modal";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useAssignFinancingCaseModal } from "./store";
import { useExtracted } from "next-intl";
import { Center, VStack } from "@styled-system/jsx";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Suspense } from "react";
import { Spinner } from "@finstreet/ui/components/base/Spinner";
import { AssignCaseManagerForm } from "@/features/assignCaseManager/fsp/forms/assignCaseManagerForm/AssignCaseManagerForm";

export const AssignFinancingCaseModal = () => {
  const { isOpen, setIsOpen, data } = useAssignFinancingCaseModal();
  const t = useExtracted();

  if (!data) {
    return null;
  }

  return (
    <Modal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      css={{
        overflow: "visible",
        "& .modal-children-wrapper": { overflow: "visible" },
      }}
    >
      <ModalTitle>
        <VStack gap={1} alignItems={"flex-start"}>
          <Headline>{t("Bearbeiter zuweisen")}</Headline>
          <Typography color={"text.dark"}>
            {t("Anfrage Nr. {financingCaseId}", {
              financingCaseId: data.financingCaseId.slice(0, 8),
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
          <AssignCaseManagerForm financingCaseId={data.financingCaseId} />
        </Suspense>
      </ModalContent>
    </Modal>
  );
};
