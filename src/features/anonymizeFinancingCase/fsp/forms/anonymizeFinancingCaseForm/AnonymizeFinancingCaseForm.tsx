"use client";

import { useAnonymizeFinancingCaseFormConfig } from "@/features/anonymizeFinancingCase/fsp/forms/anonymizeFinancingCaseForm/anonymizeFinancingCaseFormConfig";
import { Form } from "@/shared/components/form/Form";

type AnonymizeFinancingCaseProps = {
  financingCaseId: string;
};

export const AnonymizeFinancingCaseForm = ({
  financingCaseId,
}: AnonymizeFinancingCaseProps) => {
  const config = useAnonymizeFinancingCaseFormConfig(financingCaseId);

  return (
    <Form formConfig={config}>
      <></>
    </Form>
  );
};
