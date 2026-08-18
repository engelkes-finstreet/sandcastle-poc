import { GetFspFinancingCaseOverviewResponseType } from "@/shared/backend/models/financingCaseOverview/fsp/schema";
import { useExtracted } from "next-intl";
import { TaskGroup } from "@finstreet/ui/components/patterns/TaskGroup";
import { VStack } from "@styled-system/jsx";
import { FspProvideDocumentsForCustomerTaskPanel } from "@/features/financingCaseOverview/fsp/taskGroups/onboading/FspProvideDocumentsForCustomerTaskPanel";

type FspOnboardingTaskGroupProps = {
  financingCaseOverviewResponse: GetFspFinancingCaseOverviewResponseType;
};

export const FspOnboardingTaskGroup = ({
  financingCaseOverviewResponse,
}: FspOnboardingTaskGroupProps) => {
  const t = useExtracted();

  return (
    <TaskGroup label={t("Onboarding")}>
      <VStack gap={4} alignItems={"stretch"}>
        <FspProvideDocumentsForCustomerTaskPanel
          documents={
            financingCaseOverviewResponse.onboarding.documentsForCustomer
              .providedDocuments
          }
        />
      </VStack>
    </TaskGroup>
  );
};
