import { TaskGroup } from "@finstreet/ui/components/patterns/TaskGroup";
import { VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import CustomerContractInformationTaskPanel from "@/features/financingCaseOverview/customer/taskGroups/financingCase/CustomerContractInformationTaskPanel";
import CustomerProvideDocumentsTaskPanel from "@/features/financingCaseOverview/customer/taskGroups/financingCase/CustomerProvideDocumentsTaskPanel";

type CustomerFinancingCaseTaskGroupProps = {
  financingCaseId: string;
  contractInformation: {
    contractInformationComplete: boolean;
    legalRepresentativesComplete: boolean;
  };
  provideDocuments: {
    complete: boolean;
    uploadedCount: number;
    totalCount: number;
  };
};

export default function CustomerFinancingCaseTaskGroup({
  financingCaseId,
  contractInformation,
  provideDocuments,
}: CustomerFinancingCaseTaskGroupProps) {
  const t = useExtracted();

  return (
    <TaskGroup label={t("Ihr Factoringantrag")}>
      <VStack gap={4} alignItems={"stretch"}>
        <CustomerContractInformationTaskPanel
          contractInformationComplete={
            contractInformation.contractInformationComplete
          }
          legalRepresentativesComplete={
            contractInformation.legalRepresentativesComplete
          }
          financingCaseId={financingCaseId}
        />
        <CustomerProvideDocumentsTaskPanel
          uploadedCount={provideDocuments.uploadedCount}
          totalCount={provideDocuments.totalCount}
          complete={provideDocuments.complete}
          financingCaseId={financingCaseId}
        />
      </VStack>
    </TaskGroup>
  );
}
