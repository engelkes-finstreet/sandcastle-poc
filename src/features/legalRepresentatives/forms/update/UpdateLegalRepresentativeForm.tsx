"use client";

import { Form } from "@/shared/components/form/Form";
import { LegalRepresentativeFormFields } from "../LegalRepresentativeFormFields";
import { useUpdateLegalRepresentativeFormConfig } from "./useUpdateLegalRepresentativeFormConfig";
import { LegalRepresentativeDefaultValues } from "../legalRepresentativeSchema";

type UpdateLegalRepresentativeFormProps = {
  defaultValues: LegalRepresentativeDefaultValues;
  financingCaseId: string;
};

export const UpdateLegalRepresentativeForm = ({
  defaultValues,
  financingCaseId,
}: UpdateLegalRepresentativeFormProps) => {
  const config = useUpdateLegalRepresentativeFormConfig({
    defaultValues,
    financingCaseId,
  });

  return (
    <Form formConfig={config}>
      <LegalRepresentativeFormFields fieldNames={config.fieldNames} />
    </Form>
  );
};
