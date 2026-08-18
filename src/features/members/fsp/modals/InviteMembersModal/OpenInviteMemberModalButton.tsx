"use client";

import { useInviteMemberModal } from "@/features/members/fsp/modals/InviteMembersModal/store";
import {
  GetDepartmentOptionsResponseType,
  GetSigningGroupOptionsResponseType,
} from "@/shared/backend/models/memberships/schema";
import { Button } from "@finstreet/ui/components/base/Button";
import { dataTestIds } from "e2e/data/dataTestIds";
import { useExtracted } from "next-intl";

type OpenInviteMemberModalButtonProps = {
  departmentOptions: GetDepartmentOptionsResponseType;
  signingGroupOptions: GetSigningGroupOptionsResponseType;
};

export const OpenInviteMemberModalButton = ({
  departmentOptions,
  signingGroupOptions,
}: OpenInviteMemberModalButtonProps) => {
  const t = useExtracted();
  const { setData } = useInviteMemberModal();

  const handleClick = () => {
    setData({
      departments: departmentOptions,
      signingGroups: signingGroupOptions,
    });
  };

  return (
    <Button
      onClick={handleClick}
      data-testid={dataTestIds.members.inviteMember.inviteMemberButton}
    >
      {t("Neuen Benutzer einladen")}
    </Button>
  );
};
