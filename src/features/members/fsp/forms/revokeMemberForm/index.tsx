"use client";

import { useRevokeMemberFormConfig } from "@/features/members/fsp/forms/revokeMemberForm/revokeMemberFormConfig";
import { Form } from "@/shared/components/form/Form";
import { Portal } from "@/shared/types/Portal";

interface RevokeMemberFormProps {
  membershipId: string;
  portal: Portal;
}

export const RevokeMemberForm = ({
  membershipId,
  portal,
}: RevokeMemberFormProps) => {
  const config = useRevokeMemberFormConfig(membershipId, portal);

  return (
    <Form formConfig={config}>
      <></>
    </Form>
  );
};
