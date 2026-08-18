"use client";

import { Form } from "@finstreet/forms";
import { useSetNewPasswordFormConfig } from "./useSetNewPasswordFormConfig";
import { DynamicFormField } from "@/shared/components/form/DynamicFormField";

export const SetNewPasswordForm = () => {
  const config = useSetNewPasswordFormConfig();
  const { fieldNames } = config;

  return (
    <Form formConfig={config}>
      <DynamicFormField fieldName={fieldNames.password} />
    </Form>
  );
};
