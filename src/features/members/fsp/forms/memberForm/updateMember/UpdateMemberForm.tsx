import { MemberFormFields } from "@/features/members/fsp/forms/memberForm/MemberFormFields";
import { useUpdateMemberFormConfig } from "@/features/members/fsp/forms/memberForm/updateMember/updateMemberFormConfig";
import {
  GetDepartmentOptionsResponseType,
  GetSigningGroupOptionsResponseType,
} from "@/shared/backend/models/memberships/schema";
import { Form } from "@/shared/components/form/Form";
import { FspMemberType } from "@/shared/backend/models/fspMembers/schema";

type UpdateMemberFormProps = {
  departments: GetDepartmentOptionsResponseType;
  signingGroups: GetSigningGroupOptionsResponseType;
  member: FspMemberType;
};

export const UpdateMemberForm = ({
  departments,
  signingGroups,
  member,
}: UpdateMemberFormProps) => {
  const config = useUpdateMemberFormConfig({
    departments,
    signingGroups,
    member,
  });

  return (
    <Form formConfig={config}>
      <MemberFormFields fieldNames={config.fieldNames} isUpdateMode={true} />
    </Form>
  );
};
