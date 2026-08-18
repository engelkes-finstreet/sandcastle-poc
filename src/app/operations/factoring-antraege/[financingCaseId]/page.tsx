import { FspFinancingCaseOverviewPageHeader } from "@/features/financingCaseOverview/fsp/components/FspFinancingCaseOverviewPageHeader";
import { getFspFinancingCaseOverview } from "@/shared/backend/models/financingCaseOverview/fsp/server";
import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import FspInternalTaskGroup from "@/features/financingCaseOverview/fsp/taskGroups/internal/FspInternalTaskGroup";
import { VStack } from "@styled-system/jsx";
import { FspVerifyInquiryTaskGroup } from "@/features/financingCaseOverview/fsp/taskGroups/verifyInquiry/FspVerifyInquiryTaskGroup";
import { FspOnboardingTaskGroup } from "@/features/financingCaseOverview/fsp/taskGroups/onboading/FspOnboardingTaskGroup";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";
import { fetchWithErrorHandling } from "@/shared/backend/fetchWithErrorHandling";
import { AssignFinancingCaseModal } from "@/features/assignCaseManager/fsp/modals/assignFinancingCaseModal/modal";
import { ArchiveFinancingCaseModal } from "@/features/archiveFinancingCase/fsp/modals/archiveFinancingCaseModal/modal";
import { AnonymizeFinancingCaseModal } from "@/features/anonymizeFinancingCase/fsp/modals/anonymizeFinancingCaseModal/modal";

type FspFinancingCaseOverviewPageProps = {
  params: Promise<{ financingCaseId: string }>;
};

export const metadata: Metadata = {
  title: `Finanzierungsantrag | ${Constants.companyName}`,
};

export default async function FspFinancingCaseOverviewPage({
  params,
}: FspFinancingCaseOverviewPageProps) {
  const { financingCaseId } = await params;
  const financingCaseOverviewResult = await fetchWithErrorHandling(() =>
    getFspFinancingCaseOverview({
      pathVariables: { financingCaseId },
    }),
  );

  return (
    <>
      <FspFinancingCaseOverviewPageHeader
        financingCaseOverviewResponse={financingCaseOverviewResult}
        financingCaseId={financingCaseId}
      />
      <PageContent>
        <VStack gap={10} alignItems={"stretch"}>
          <FspVerifyInquiryTaskGroup
            financingCaseId={financingCaseId}
            financingCaseOverviewResponse={financingCaseOverviewResult}
          />
          <FspOnboardingTaskGroup
            financingCaseOverviewResponse={financingCaseOverviewResult}
          />
          <FspInternalTaskGroup
            financingCaseId={financingCaseId}
            internalRemark={financingCaseOverviewResult.internalRemark}
            mutable={financingCaseOverviewResult.flags.mutable}
          />
        </VStack>
      </PageContent>
      <ArchiveFinancingCaseModal />
      <AnonymizeFinancingCaseModal />
      <AssignFinancingCaseModal />
    </>
  );
}
