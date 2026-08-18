import { DynamicFormField } from "@/shared/components/form/DynamicFormField";
import { Form } from "@/shared/components/form/Form";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { useExtracted } from "next-intl";
import { useAssignCaseManagerFormConfig } from "@/features/assignCaseManager/fsp/forms/assignCaseManagerForm/useAssignCaseManagerFormConfig";
import { useGetCaseManagerCandidatesQuery } from "@/features/assignCaseManager/fsp/backend/queries/useGetCaseManagerCandidatesQuery";

type AssignCaseManagerFormProps = {
  financingCaseId: string;
};

export const AssignCaseManagerForm = ({
  financingCaseId,
}: AssignCaseManagerFormProps) => {
  const { data: caseManagerCandidates } = useGetCaseManagerCandidatesQuery({
    financingCaseId,
  });
  const t = useExtracted();
  const config = useAssignCaseManagerFormConfig({
    financingCaseId,
    caseManagerCandidates,
  });

  if (caseManagerCandidates.length === 0) {
    return <Banner type="warning">{t("Keine Bearbeiter gefunden")}</Banner>;
  }

  return (
    <Form formConfig={config}>
      <DynamicFormField fieldName={config.fieldNames.caseManagerId} />
    </Form>
  );
};
