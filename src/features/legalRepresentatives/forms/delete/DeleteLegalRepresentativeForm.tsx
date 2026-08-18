"use client";

import { Form } from "@/shared/components/form/Form";
import { useDeleteLegalRepresentativeFormConfig } from "./useDeleteLegalRepresentativeFormConfig";

interface DeleteLegalRepresentativeFormProps {
  financingCaseId: string;
  legalRepresentativeId: string;
}

export const DeleteLegalRepresentativeForm = ({
  financingCaseId,
  legalRepresentativeId,
}: DeleteLegalRepresentativeFormProps) => {
  const config = useDeleteLegalRepresentativeFormConfig({
    financingCaseId,
    legalRepresentativeId,
  });

  return (
    <Form formConfig={config}>
      <></>
    </Form>
  );
};
