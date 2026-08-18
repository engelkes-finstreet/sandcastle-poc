"use client";

import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import { useResetPasswordFormConfig } from "./useResetPasswordFormConfig";
import { Form } from "@finstreet/forms";

interface ResetPasswordFormProps {
  passwordResetToken: string;
}

export const ResetPasswordForm = ({
  passwordResetToken,
}: ResetPasswordFormProps) => {
  const config = useResetPasswordFormConfig({ passwordResetToken });
  const { fieldNames } = config;

  return (
    <Form formConfig={config}>
      <DynamicFormField fieldName={fieldNames.password} />
      <DynamicFormField fieldName={fieldNames.passwordConfirmation} />
    </Form>
  );
};
