"use client";

import { useUpdateInternalRemarkFormConfig } from "./updateInternalRemarkFormConfig";
import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import { Form } from "@/shared/components/form/Form";

interface UpdateInternalRemarkFormProps {
  financingCaseId: string;
  currentInternalRemark?: string | null;
}

export const UpdateInternalRemarkForm = ({
  financingCaseId,
  currentInternalRemark,
}: UpdateInternalRemarkFormProps) => {
  const config = useUpdateInternalRemarkFormConfig(
    financingCaseId,
    currentInternalRemark,
  );
  const { fieldNames } = config;

  return (
    <Form formConfig={config}>
      <DynamicFormField fieldName={fieldNames.internalRemark} />
    </Form>
  );
};
