import { getExtracted } from "next-intl/server";
import { fetchWithErrorHandling } from "@/shared/backend/fetchWithErrorHandling";
import { DocumentExchangeService } from "@/features/documentExchange/backend/server";
import { DocumentExchangePageContent } from "@/features/documentExchange/common/components/DocumentExchangePageContent";
import { CustomerFinancingCaseOverviewDocumentExchangePageHeader } from "@/layouts/customer/CustomerFinancingCaseOverviewDocumentExchangePageHeader";

type Props = {
  params: Promise<{ financingCaseId: string }>;
};

export default async function CustomerProvideDocumentsPage({ params }: Props) {
  const t = await getExtracted();
  const { financingCaseId } = await params;

  const { header, flags, documentRequests } = await fetchWithErrorHandling(() =>
    DocumentExchangeService.getRequestsWithDocuments({
      pathVariables: { financingCaseId },
    }),
  );

  return (
    <>
      <CustomerFinancingCaseOverviewDocumentExchangePageHeader
        title={t("Notwendige Dokumente bereitstellen")}
        financingCaseId={financingCaseId}
        company={header.companyName}
      />
      <DocumentExchangePageContent
        documentRequests={documentRequests}
        financingCaseId={financingCaseId}
        editable={flags.editable}
        itemsDeletable={true}
      />
    </>
  );
}
