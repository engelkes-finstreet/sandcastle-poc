import {
  UpdateMemberDefaultValues,
  UpdateMemberFormConfig,
  updateMemberFormSchema,
  UpdateMemberFormState,
} from "@/features/members/fsp/forms/memberForm/inviteMemberFormSchema";
import {
  GetDepartmentOptionsResponseType,
  GetSigningGroupOptionsResponseType,
} from "@/shared/backend/models/memberships/schema";
import { useUpdateMemberFormFields } from "../useMemberFormFields";
import { Button } from "@finstreet/ui/components/base/Button";
import { createFormFieldNames } from "@finstreet/forms/lib";
import { HStack } from "@styled-system/jsx";
import { dataTestIds } from "e2e/data/dataTestIds";
import { FaFloppyDisk } from "react-icons/fa6";
import { useExtracted } from "next-intl";
import { updateMemberFormAction } from "@/features/members/fsp/forms/memberForm/updateMember/updateMemberFormAction";
import { FspMemberType } from "@/shared/backend/models/fspMembers/schema";
import { YesNoOptions } from "@/shared/components/form/YesNoRadioGroup/options";
import { useUpdateMemberModal } from "@/features/members/fsp/modals/UpdateMemberModal/store";

type Props = {
  member: FspMemberType;
  departments: GetDepartmentOptionsResponseType;
  signingGroups: GetSigningGroupOptionsResponseType;
};

export const useUpdateMemberFormConfig = ({
  member,
  departments,
  signingGroups,
}: Props): UpdateMemberFormConfig => {
  const t = useExtracted();
  const fields = useUpdateMemberFormFields({ departments, signingGroups });

  const { setIsOpen } = useUpdateMemberModal();
  const defaultValues: UpdateMemberDefaultValues = {
    membershipId: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    department: member.department.value,
    signingGroup: member.signingGroup.value,
    conditionsManagement: member.roles.includes(
      "FinancialServiceProvider::MasterDataManager",
    )
      ? YesNoOptions.YES
      : YesNoOptions.NO,
  };

  return {
    fields,
    defaultValues,
    schema: updateMemberFormSchema,
    fieldNames: createFormFieldNames(fields),
    serverAction: updateMemberFormAction,
    useErrorAction: () => {
      return (formState: UpdateMemberFormState) => {
        console.log(formState?.error);
      };
    },
    useSuccessAction: () => {
      return (_formState: UpdateMemberFormState) => {
        setIsOpen(false);
      };
    },
    renderFormActions: (isPending: boolean) => {
      return (
        <HStack mt={12} justifyContent={"space-between"}>
          <Button type="button" onClick={() => setIsOpen(false)} variant="text">
            {t("Abbrechen")}
          </Button>
          <Button
            loading={isPending}
            type="submit"
            icon={<FaFloppyDisk />}
            data-testid={dataTestIds.buttons.submitButton}
          >
            {t("Speichern")}
          </Button>
        </HStack>
      );
    },
  };
};
