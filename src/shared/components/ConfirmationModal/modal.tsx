"use client";

import {
  Modal,
  ModalTitle,
  ModalContent,
  ModalActions,
} from "@finstreet/ui/components/patterns/Modal";
import { useConfirmationModal } from "./store";
import { HStack } from "@styled-system/jsx";
import { Button } from "@finstreet/ui/components/base/Button";
import { useMemo, useState } from "react";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { useExtracted } from "next-intl";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { usePortal } from "@/shared/context/portal/portalContext";
import { dataTestIds } from "e2e/data/dataTestIds";

type ActionProps = {
  action: (setError: (error: string | undefined) => void) => void;
  formId?: never;
};

type FormProps = {
  formId: string;
  action?: never;
};

type Props = ActionProps | FormProps;

export const ConfirmationModal = ({ action, formId }: Props) => {
  const { isOpen, setIsOpen, isPending } = useConfirmationModal();
  const [error, setError] = useState<string | undefined>(undefined);
  const t = useExtracted();
  const { description, title } = useModalTranslations();

  const confirmButtonProps = formId
    ? { type: "submit" as const, form: formId }
    : {
        onClick: () => {
          action!(setError);
          setIsOpen(false);
        },
      };

  return (
    <Modal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      css={{ maxWidth: "600px!" }}
    >
      <ModalTitle>{title}</ModalTitle>
      <ModalContent>
        <Typography>{description}</Typography>
        {error ? <Banner type="error">{error}</Banner> : null}
      </ModalContent>
      <ModalActions>
        <HStack justifyContent="space-between" width="100%">
          <Button variant="text" onClick={() => setIsOpen(false)}>
            {t("Abbrechen")}
          </Button>
          <Button
            variant="primary"
            {...confirmButtonProps}
            data-testid={dataTestIds.confirmationModalConfirm.submitButton}
            loading={isPending}
          >
            {t("Eingaben final bestätigen")}
          </Button>
        </HStack>
      </ModalActions>
    </Modal>
  );
};

function useModalTranslations() {
  const t = useExtracted();
  const { portal } = usePortal();
  const description = useMemo(() => {
    return portal === "customer"
      ? t(
          "Bitte überprüfen Sie Ihre Angaben sorgfältig. Nach der Bestätigung sind diese verbindlich und können nur noch durch die BfW geändert werden. Möchten Sie fortfahren?",
        )
      : t(
          "Nach der Bestätigung kann der Kunde die Angaben nicht mehr ändern. Sie können die Angaben weiterhin bearbeiten. Möchten Sie fortfahren?",
        );
  }, [portal, t]);

  return {
    description,
    title: t("Eingaben bestätigen"),
  };
}
