"use client";

import { Button } from "@finstreet/ui/components/base/Button";
import { VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { FaArrowRight, FaSpinner } from "react-icons/fa6";
import { confirmLegalRepresentativesAction } from "@/shared/backend/models/legalRepresentatives/confirmLegalRepresentativesAction";
import { usePortal } from "@/shared/context/portal/portalContext";
import { routes } from "@/routes";
import { dataTestIds } from "e2e/data/dataTestIds";
import { ConfirmationModal } from "@/shared/components/ConfirmationModal/modal";
import { useConfirmationModal } from "@/shared/components/ConfirmationModal/store";

type ConfirmLegalRepresentativesButtonProps = {
  financingCaseId: string;
  legalRepresentativesConfirmable: boolean;
};

export const ConfirmLegalRepresentativesButton = ({
  financingCaseId,
  legalRepresentativesConfirmable,
}: ConfirmLegalRepresentativesButtonProps) => {
  const [isConfirming, startConfirmTransition] = useTransition();
  const { setIsOpen, setIsPending } = useConfirmationModal();
  const t = useExtracted();
  const router = useRouter();
  const confirmLegalRepresentativeRedirectUrl =
    useConfirmLegalRepresentativeRedirectUrl();

  useEffect(() => {
    setIsPending(isConfirming);
  }, [isConfirming, setIsPending]);

  const handleConfirmLegalRepresentatives = (
    setError: (error: string | undefined) => void,
  ) => {
    startConfirmTransition(async () => {
      const result = await confirmLegalRepresentativesAction({
        pathVariables: { financingCaseId },
      });

      if (result.success) {
        router.push(confirmLegalRepresentativeRedirectUrl(financingCaseId));
      } else {
        setError(result.error.message);
      }
    });
  };

  return (
    <VStack gap={4}>
      <Button
        icon={isConfirming ? <FaSpinner /> : <FaArrowRight />}
        disabled={!legalRepresentativesConfirmable || isConfirming}
        onClick={() => setIsOpen(true)}
        data-testid={
          dataTestIds.legalRepresentatives.confirmLegalRepresentativesButton
        }
      >
        {t("Vertretungsberechtigte Personen bestätigen")}
      </Button>
      <ConfirmationModal action={handleConfirmLegalRepresentatives} />
    </VStack>
  );
};

function useConfirmLegalRepresentativeRedirectUrl() {
  const { portal } = usePortal();

  return (financingCaseId: string) => {
    return portal === "customer"
      ? routes.customer.financingCase.legalRepresentatives(financingCaseId)
      : routes.fsp.financingCase.legalRepresentatives(financingCaseId);
  };
}
