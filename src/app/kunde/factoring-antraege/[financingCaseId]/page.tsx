import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";
import { VStack } from "@styled-system/jsx";
import { ResetScrollPosition } from "@finstreet/ui/components/base/ResetScrollPosition";
import { CustomerFinancingCaseOverviewPageHeader } from "@/features/financingCaseOverview/customer/CustomerFinancingCaseOverviewPageHeader";
import CustomerVerifyInquiryTaskGroup from "@/features/financingCaseOverview/customer/taskGroups/verifyInquiry/CustomerVerifyInquiryTaskGroup";
import CustomerDocumentsTaskGroup from "@/features/financingCaseOverview/customer/taskGroups/documents/CustomerDocumentsTaskGroup";
import CustomerFinancingCaseTaskGroup from "@/features/financingCaseOverview/customer/taskGroups/financingCase/CustomerFinancingCaseTaskGroup";

export const metadata: Metadata = {
  title: `Ihre Factoringanfrage | ${Constants.companyName}`,
};

type CustomerFactoringFinancingCaseDetailsPageProps = {
  params: Promise<{ financingCaseId: string }>;
};

export default async function CustomerFactoringFinancingCaseDetailsPage({
  params,
}: CustomerFactoringFinancingCaseDetailsPageProps) {
  const { financingCaseId } = await params;
  return (
    <>
      <ResetScrollPosition />
      <CustomerFinancingCaseOverviewPageHeader
        providedAt={"2026-01-01"}
        company={"Mustermann GmbH"}
        factoringAmount={25000}
        status={{
          label: "In Bearbeitung",
          value: "inProgress",
          steppedProgressStatus: { total: 6, current: 4 },
        }}
      />
      <PageContent>
        <VStack gap={10} alignItems={"stretch"}>
          <CustomerVerifyInquiryTaskGroup financingCaseId={financingCaseId} />
          <CustomerFinancingCaseTaskGroup
            financingCaseId={financingCaseId}
            contractInformation={{
              contractInformationComplete: false,
              legalRepresentativesComplete: false,
            }}
            provideDocuments={{
              complete: false,
              uploadedCount: 0,
              totalCount: 6,
            }}
          />
          <CustomerDocumentsTaskGroup
            documents={[
              {
                id: "1",
                name: "Unterschriebener Vertrag",
                providedAt: "2024-05-16T00:00:00Z",
              },
              {
                id: "2",
                name: "Allgemeine Geschäftsbedingungen",
                providedAt: "2024-05-16T00:00:00Z",
              },
            ]}
          />
        </VStack>
      </PageContent>
    </>
  );
}
