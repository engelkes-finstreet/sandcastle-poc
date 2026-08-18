"use client";

import { Form } from "@/shared/components/form/Form";

import { AssignSubstituteFormFields } from "./AssignSubstituteFormFields";
import { getAssignSubstituteDefaultValues } from "./getAssignSubstituteDefaultValues";
import { useAssignSubstituteFormConfig } from "./useAssignSubstituteFormConfig";
import { useAddSubstituteModal } from "../../modals/AddSubstituteModal/store";

export const AssignSubstituteForm = () => {
  const { membershipId } = useAddSubstituteModal();
  const defaultValues = getAssignSubstituteDefaultValues({ membershipId });
  const config = useAssignSubstituteFormConfig(defaultValues, { membershipId });

  return (
    <Form formConfig={config}>
      <AssignSubstituteFormFields fieldNames={config.fieldNames} />
    </Form>
  );
};
