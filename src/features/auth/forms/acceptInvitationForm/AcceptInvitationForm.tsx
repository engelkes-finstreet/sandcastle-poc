"use client";

import { useAcceptInvitationFormConfig } from "./useAcceptInvitationFormConfig";
import { Form } from "@finstreet/forms";
import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import { VStack } from "@styled-system/jsx";

interface AcceptInvitationFormProps {
  token: string;
  firstName: string;
  lastName: string;
}

export const AcceptInvitationForm = ({
  token,
  firstName,
  lastName,
}: AcceptInvitationFormProps) => {
  const config = useAcceptInvitationFormConfig({ token, firstName, lastName });
  const { fieldNames } = config;

  return (
    <Form formConfig={config}>
      <VStack gap={4} mt={4} alignItems={"stretch"}>
        <DynamicFormField fieldName={fieldNames.password} />
        <DynamicFormField fieldName={fieldNames.passwordConfirmation} />
      </VStack>
    </Form>
  );
};
