import {
  RevokeMemberDefaultValues,
  RevokeMemberFormConfig,
  revokeMemberFormSchema,
  RevokeMemberFormState,
  RevokeMemberFormType,
} from "@/features/members/fsp/forms/revokeMemberForm/revokeMemberFormSchema";
import { FormFieldsType } from "@finstreet/forms";
import { revokeMemberFormAction } from "@/features/members/fsp/forms/revokeMemberForm/revokeMemberFormAction";
import { FaTrash } from "react-icons/fa6";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack } from "@styled-system/jsx";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { useRevokeMemberModal } from "@/features/members/fsp/modals/RevokeMemberModal/store";
import { useExtracted } from "next-intl";
import { dataTestIds } from "e2e/data/dataTestIds";
import { Portal } from "@/shared/types/Portal";
import { useDeleteUserModal } from "@/features/members/customer/modals/DeleteUserModal/store";

export function useRevokeMemberFormConfig(
  membershipId: string,
  portal: Portal,
): RevokeMemberFormConfig {
  const { setIsOpen } = useRevokeMemberModal();
  const { setIsOpen: setDeletePmUserModalOpen } = useDeleteUserModal();
  const t = useExtracted();

  const handleClose = () => {
    if (portal === "customer") {
      setDeletePmUserModalOpen(false);
    } else {
      setIsOpen(false);
    }
  };

  const defaultValues: RevokeMemberDefaultValues = {
    membershipId,
  };

  const fields: FormFieldsType<RevokeMemberFormType> = {
    membershipId: {
      type: "hidden",
    },
  };

  return {
    fields,
    defaultValues,
    schema: revokeMemberFormSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: revokeMemberFormAction,
    useErrorAction: () => {
      return (formState: RevokeMemberFormState) => {
        console.log(formState?.error);
      };
    },
    useSuccessAction: () => {
      return (_formState: RevokeMemberFormState) => {
        handleClose();
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={12} justifyContent={"space-between"}>
          <Button type="button" onClick={handleClose} variant="text">
            {t("Abbrechen")}
          </Button>
          <Button
            loading={isPending}
            variant="destructive"
            type="submit"
            icon={<FaTrash />}
            data-testid={
              dataTestIds.members.deleteMember.deleteMemberConfirmButton
            }
          >
            {t("Benutzer löschen")}
          </Button>
        </HStack>
      );
    },
  };
}
