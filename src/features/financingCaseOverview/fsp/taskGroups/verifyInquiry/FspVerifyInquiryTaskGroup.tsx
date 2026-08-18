import { GetFspFinancingCaseOverviewResponseType } from "@/shared/backend/models/financingCaseOverview/fsp/schema";
import { useExtracted } from "next-intl";
import { TaskGroup } from "@finstreet/ui/components/patterns/TaskGroup";
import { VStack } from "@styled-system/jsx";
import { FspInquiryTaskPanel } from "@/features/financingCaseOverview/fsp/taskGroups/verifyInquiry/FspInquiryTaskPanel";
import { FspProvidedDocumentsTaskPanel } from "@/features/financingCaseOverview/fsp/taskGroups/verifyInquiry/FspProvidedDocumentsTaskPanel";
import { FspContractInformationTaskPanel } from "@/features/financingCaseOverview/fsp/taskGroups/verifyInquiry/FspContractInformationTaskPanel";

type FspVerifyInquiryTaskGroupProps = {
  financingCaseId: string;
  financingCaseOverviewResponse: GetFspFinancingCaseOverviewResponseType;
};

export const FspVerifyInquiryTaskGroup = ({
  financingCaseId,
  financingCaseOverviewResponse,
}: FspVerifyInquiryTaskGroupProps) => {
  const t = useExtracted();

  return (
    <TaskGroup label={t("Factoring-Anfrage")}>
      <VStack gap={4} alignItems={"stretch"}>
        <FspInquiryTaskPanel
          financingCaseId={financingCaseId}
          completed={
            financingCaseOverviewResponse.verifyInquiry.inquiry.completed
          }
        />
        <FspContractInformationTaskPanel
          financingCaseId={financingCaseId}
          completed={
            financingCaseOverviewResponse.verifyInquiry.contractCompletion
              .completed
          }
          legalRepresentativesConfirm={
            financingCaseOverviewResponse.verifyInquiry.contractCompletion
              .legalRepresentativesConfirm
          }
        />
        <FspProvidedDocumentsTaskPanel
          financingCaseId={financingCaseId}
          completedCount={
            financingCaseOverviewResponse.verifyInquiry.customerDocuments
              .completedCount
          }
          totalCount={
            financingCaseOverviewResponse.verifyInquiry.customerDocuments
              .totalCount
          }
        />
      </VStack>
    </TaskGroup>
  );
};
