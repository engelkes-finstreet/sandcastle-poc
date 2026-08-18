"use client";

import { useAddSubstituteModal } from "@/features/substitutes/fsp/modals/AddSubstituteModal/store";
import { Button } from "@finstreet/ui/components/base/Button";
import { Tooltip } from "@finstreet/ui/components/base/Tooltip";
import { dataTestIds } from "e2e/data/dataTestIds";

type Props = {
  isSubstituting: boolean;
  membershipId?: string;
  buttonLabel: string;
  tooltip: string;
};

export const OpenAddSubstituteModalButton = ({
  isSubstituting,
  membershipId,
  buttonLabel,
  tooltip,
}: Props) => {
  const { openModal } = useAddSubstituteModal();

  const handleClick = () => {
    openModal(membershipId);
  };

  if (isSubstituting) {
    return (
      <Tooltip text={tooltip} openOnHover={true}>
        <Button
          disabled={true}
          data-testid={dataTestIds.members.addSubstitute.openModalButton}
        >
          {buttonLabel}
        </Button>
      </Tooltip>
    );
  }

  return (
    <Button
      onClick={handleClick}
      data-testid={dataTestIds.members.addSubstitute.openModalButton}
    >
      {buttonLabel}
    </Button>
  );
};
