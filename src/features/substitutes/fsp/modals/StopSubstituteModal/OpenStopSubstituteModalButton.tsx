"use client";

import { Button } from "@finstreet/ui/components/base/Button";
import { useExtracted } from "next-intl";
import { useStopSubstituteModal } from "./store";
import { dataTestIds } from "e2e/data/dataTestIds";

type Props = {
  membershipId?: string;
};

export const OpenStopSubstituteModalButton = ({ membershipId }: Props) => {
  const { openModal } = useStopSubstituteModal();
  const t = useExtracted();

  const handleClick = () => {
    openModal(membershipId);
  };

  return (
    <Button
      onClick={handleClick}
      data-testid={dataTestIds.members.stopSubstitute.openModalButton}
    >
      {t("Vertretung beenden")}
    </Button>
  );
};
