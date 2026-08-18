import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import { getExtracted } from "next-intl/server";
import CustomerFinancingCaseOverviewSubPageHeader from "@/features/financingCaseOverview/customer/CustomerFinancingCaseOverviewSubPageHeader";
import { LegalRepresentativeGrid } from "@/features/legalRepresentatives/components/LegalRepresentativeGrid";
import { fetchWithErrorHandling } from "@/shared/backend/fetchWithErrorHandling";
import { getLegalRepresentatives } from "@/shared/backend/models/legalRepresentatives/server";

type Props = {
  params: Promise<{ financingCaseId: string }>;
};

export default async function CustomerLegalRepresentativesPage({
  params,
}: Props) {
  const t = await getExtracted();
  const { financingCaseId } = await params;

  const legalRepresentativesResult = await fetchWithErrorHandling(() =>
    getLegalRepresentatives()({
      pathVariables: {
        financingCaseId,
      },
    }),
  );

  return (
    <>
      <CustomerFinancingCaseOverviewSubPageHeader
        financingCaseId={financingCaseId}
        title={t("Vertretungsberechtigte Personen")}
        company={"Mustermann GmbH"}
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
