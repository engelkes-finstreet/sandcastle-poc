import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import { getExtracted } from "next-intl/server";
import CustomerFinancingCaseOverviewSubPageHeader from "@/features/financingCaseOverview/customer/CustomerFinancingCaseOverviewSubPageHeader";

type Props = {
  params: Promise<{ financingCaseId: string }>;
};

export default async function CustomerInquiryDetailsPage({ params }: Props) {
  const t = await getExtracted();
  const { financingCaseId } = await params;

  return (
    <>
      <CustomerFinancingCaseOverviewSubPageHeader
        financingCaseId={financingCaseId}
        title={t("Factoringanfrage")}
        company={"Mustermann GmbH"}
      />
      <PageContent>anfrage</PageContent>
    </>
  );
}
