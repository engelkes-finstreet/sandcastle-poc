"use client";

import { useLoginFormConfig } from "@/features/auth/forms/loginForm/useLoginFormConfig";
import { Form } from "@finstreet/forms";
import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import { VStack } from "@styled-system/jsx";

export const LoginForm = () => {
  const config = useLoginFormConfig();
  const { fieldNames } = config;

  return (
    <Form formConfig={config}>
      <DynamicFormField fieldName={fieldNames.email} />
      <VStack gap={2} alignItems={"stretch"}>
        <DynamicFormField fieldName={fieldNames.password} />
      </VStack>
    </Form>
  );
};
