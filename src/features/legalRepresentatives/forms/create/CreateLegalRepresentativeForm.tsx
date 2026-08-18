"use client";

import { Form } from "@/shared/components/form/Form";
import { LegalRepresentativeFormFields } from "../LegalRepresentativeFormFields";
import { useCreateLegalRepresentativeFormConfig } from "./useCreateLegalRepresentativeFormConfig";

type CreateLegalRepresentativeFormProps = {
  financingCaseId: string;
};

export const CreateLegalRepresentativeForm = ({
  financingCaseId,
}: CreateLegalRepresentativeFormProps) => {
  const config = useCreateLegalRepresentativeFormConfig({
    financingCaseId,
  });

  return (
    <Form formConfig={config}>
      <LegalRepresentativeFormFields fieldNames={config.fieldNames} />
    </Form>
  );
};
