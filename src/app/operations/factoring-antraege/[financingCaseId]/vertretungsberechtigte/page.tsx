import { getFspFinancingCaseOverview } from "@/shared/backend/models/financingCaseOverview/fsp/server";
import FspFinancingCaseOverviewSubPageHeader from "@/features/financingCaseOverview/fsp/components/FspFinancingCaseOverviewSubPageHeader";
import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import { LegalRepresentativeGrid } from "@/features/legalRepresentatives/components/LegalRepresentativeGrid";
import { fetchWithErrorHandling } from "@/shared/backend/fetchWithErrorHandling";
import { getLegalRepresentatives } from "@/shared/backend/models/legalRepresentatives/server";
import { getExtracted } from "next-intl/server";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";

export const metadata: Metadata = {
  title: `Vertretungsberechtigte Personen | ${Constants.companyName}`,
};

type Props = {
  params: Promise<{ financingCaseId: string }>;
};

export default async function OperationsFinancingCaseLegalRepresentativesPage({
  params,
}: Props) {
  const { financingCaseId } = await params;
  const t = await getExtracted();

  const legalRepresentativesResult = await fetchWithErrorHandling(() =>
    getLegalRepresentatives()({
      pathVariables: { financingCaseId },
    }),
  );

  return (
    <>
      <FspFinancingCaseOverviewSubPageHeader
        title={t("Vertretungsberechtigte Personen")}
        financingCaseId={financingCaseId}
        company={legalRepresentativesResult.header.companyName}
      />
      <PageContent>
        <LegalRepresentativeGrid
          legalRepresentativesResult={legalRepresentativesResult}
          financingCaseId={financingCaseId}
        />
      </PageContent>
    </>
  );
}
