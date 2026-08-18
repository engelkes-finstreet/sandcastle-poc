import { useInviteMemberFormConfig } from "@/features/members/fsp/forms/memberForm/inviteMember/inviteMemberFormConfig";
import { Form } from "@/shared/components/form/Form";
import { GetDepartmentOptionsResponseType } from "@/shared/backend/models/memberships/schema";
import { GetSigningGroupOptionsResponseType } from "@/shared/backend/models/memberships/schema";
import { MemberFormFields } from "@/features/members/fsp/forms/memberForm/MemberFormFields";

type InviteMemberFormProps = {
  departments: GetDepartmentOptionsResponseType;
  signingGroups: GetSigningGroupOptionsResponseType;
};

export const InviteMemberForm = ({
  departments,
  signingGroups,
}: InviteMemberFormProps) => {
  const config = useInviteMemberFormConfig({
    departments,
    signingGroups,
  });

  return (
    <Form formConfig={config}>
      <MemberFormFields fieldNames={config.fieldNames} />
    </Form>
  );
};
