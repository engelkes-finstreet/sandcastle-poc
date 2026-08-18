"use client";

import { useRequestAccountUnlockFormConfig } from "@/features/auth/forms/requestAccountUnlockForm/useRequestAccountUnlockFormConfig";
import { Form } from "@finstreet/forms";
import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import { VStack } from "@styled-system/jsx";

export const RequestAccountUnlockForm = () => {
  const config = useRequestAccountUnlockFormConfig();
  const { fieldNames } = config;

  return (
    <Form formConfig={config}>
      <VStack gap={8} alignItems={"stretch"}>
        <DynamicFormField fieldName={fieldNames.email} />
      </VStack>
    </Form>
  );
};
