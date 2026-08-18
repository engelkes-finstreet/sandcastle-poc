"use client";

import { useResendInvitationFormConfig } from "@/features/members/common/forms/resendInvitationForm/resendInvitationFormConfig";
import { Form } from "@/shared/components/form/Form";

type ResendInvitationFormProps = {
  invitationId: string;
};

export function ResendInvitationForm({
  invitationId,
}: ResendInvitationFormProps) {
  const config = useResendInvitationFormConfig(invitationId);

  return (
    <Form formConfig={config}>
      <></>
    </Form>
  );
}
