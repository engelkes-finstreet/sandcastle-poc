"use client";

import { Form } from "@finstreet/forms";
import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import { useRequestPasswordResetFormConfig } from "./useRequestPasswordResetFormConfig";

export const RequestPasswordResetForm = () => {
  const config = useRequestPasswordResetFormConfig();
  const { fieldNames } = config;

  return (
    <Form formConfig={config}>
      <DynamicFormField fieldName={fieldNames.email} />
    </Form>
  );
};
