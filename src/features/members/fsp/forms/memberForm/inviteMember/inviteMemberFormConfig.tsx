"use client";

import {
  InviteMemberDefaultValues,
  InviteMemberFormConfig,
  inviteMemberFormSchema,
  InviteMemberFormState,
  InviteMemberFormType,
} from "@/features/members/fsp/forms/memberForm/inviteMemberFormSchema";
import { FormFieldsType } from "@finstreet/forms";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { inviteMemberFormAction } from "@/features/members/fsp/forms/memberForm/inviteMember/inviteMemberFormAction";
import { HStack } from "@styled-system/jsx";
import { FaFloppyDisk } from "react-icons/fa6";
import { Button } from "@finstreet/ui/components/base/Button";
import { useInviteMemberModal } from "@/features/members/fsp/modals/InviteMembersModal/store";
import { useExtracted } from "next-intl";
import {
  GetDepartmentOptionsResponseType,
  GetSigningGroupOptionsResponseType,
} from "@/shared/backend/models/memberships/schema";
import { dataTestIds } from "e2e/data/dataTestIds";

export function useInviteMemberFormConfig({
  departments,
  signingGroups,
}: {
  departments: GetDepartmentOptionsResponseType;
  signingGroups: GetSigningGroupOptionsResponseType;
}): InviteMemberFormConfig {
  const t = useExtracted();
  const { setIsOpen } = useInviteMemberModal();

  const fields: FormFieldsType<InviteMemberFormType> = {
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

  const defaultValues: InviteMemberDefaultValues = {
    firstName: "",
    lastName: "",
    email: "",
    department: undefined,
    signingGroup: undefined,
    conditionsManagement: undefined,
  };

  return {
    fields,
    defaultValues,
    schema: inviteMemberFormSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: inviteMemberFormAction,
    useErrorAction: () => {
      return (formState: InviteMemberFormState) => {
        console.log(formState?.error);
      };
    },
    useSuccessAction: () => {
      return (_formState: InviteMemberFormState) => {
        setIsOpen(false);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack
          mt={12}
          justifyContent={"space-between"}
          data-testid={
            dataTestIds.members.inviteMember.inviteMemberCancelButton
          }
        >
          <Button type="button" onClick={() => setIsOpen(false)} variant="text">
            {t("zurück")}
          </Button>
          <Button
            loading={isPending}
            type="submit"
            icon={<FaFloppyDisk />}
            data-testid={
              dataTestIds.members.inviteMember.inviteMemberConfirmButton
            }
          >
            {t("Benutzer speichern")}
          </Button>
        </HStack>
      );
    },
  };
}
