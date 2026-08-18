import {
  InviteMemberFormType,
  UpdateMemberFormType,
} from "@/features/members/fsp/forms/memberForm/inviteMemberFormSchema";
import {
  GetDepartmentOptionsResponseType,
  GetSigningGroupOptionsResponseType,
} from "@/shared/backend/models/memberships/server";
import { FormFieldsType } from "@finstreet/forms";
import { useExtracted } from "next-intl";

type Props = {
  departments: GetDepartmentOptionsResponseType;
  signingGroups: GetSigningGroupOptionsResponseType;
};

export function useInviteMemberFormFields({
  departments,
  signingGroups,
}: Props): FormFieldsType<InviteMemberFormType> {
  const t = useExtracted();

  return {
    firstName: {
      type: "input",
      label: t("Vorname"),
    },
    lastName: {
      type: "input",
      label: t("Nachname"),
    },
    email: {
      type: "input",
      label: t("E-Mail-Adresse"),
    },
    department: {
      type: "select",
      label: t("Abteilung"),
      items: departments.map((department) => ({
        label: department.label,
        value: department.value,
      })),
    },
    signingGroup: {
      type: "radio-group",
      label: t("Signatur WEG-Kredite"),
      items: signingGroups.map((signingGroup) => ({
        label: signingGroup.label,
        value: signingGroup.value,
      })),
    },
    conditionsManagement: {
      type: "yes-no-radio-group",
      label: t("Zins- & Konditionsänderungen"),
    },
  };
}

export function useUpdateMemberFormFields({
  departments,
  signingGroups,
}: Props): FormFieldsType<UpdateMemberFormType> {
  return {
    ...useInviteMemberFormFields({ departments, signingGroups }),
    membershipId: {
      type: "hidden",
    },
  };
}
