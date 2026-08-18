import { getFspFinancingCaseOverview } from "@/shared/backend/models/financingCaseOverview/fsp/server";
import FspFinancingCaseOverviewSubPageHeader from "@/features/financingCaseOverview/fsp/components/FspFinancingCaseOverviewSubPageHeader";
import { fetchWithErrorHandling } from "@/shared/backend/fetchWithErrorHandling";
import { getExtracted } from "next-intl/server";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";

type Props = {
  params: Promise<{ financingCaseId: string }>;
};

export const metadata: Metadata = {
  title: `Anfragedetails | ${Constants.companyName}`,
};

export default async function OperationsInquiryDetailsPage({ params }: Props) {
  const { financingCaseId } = await params;
  const t = await getExtracted();
  const financingCaseOverviewResponse = await fetchWithErrorHandling(() =>
    getFspFinancingCaseOverview({
      pathVariables: { financingCaseId },
    }),
  );

  //TODO: Add missing inquiry details page content

  return (
    <>
      <FspFinancingCaseOverviewSubPageHeader
        title={t("Anfragedetails")}
        financingCaseId={financingCaseId}
        company={financingCaseOverviewResponse.header.company}
      />
    </>
  );
}
