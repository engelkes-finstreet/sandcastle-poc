"use client";

import { Form } from "@/shared/components/form/Form";
import { useWithdrawInvitationFormConfig } from "./withdrawInvitationFormConfig";

interface WithdrawInvitationFormProps {
  invitationId: string;
}

export const WithdrawInvitationForm = ({
  invitationId,
}: WithdrawInvitationFormProps) => {
  const config = useWithdrawInvitationFormConfig(invitationId);

  return (
    <Form formConfig={config}>
      <></>
    </Form>
  );
};
