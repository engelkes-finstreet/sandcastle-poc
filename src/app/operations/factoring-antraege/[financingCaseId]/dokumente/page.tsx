import { getExtracted } from "next-intl/server";
import { fetchWithErrorHandling } from "@/shared/backend/fetchWithErrorHandling";
import { DocumentExchangeService } from "@/features/documentExchange/backend/server";
import { DocumentExchangePageContent } from "@/features/documentExchange/common/components/DocumentExchangePageContent";
import { FspFinancingCaseOverviewDocumentExchangePageHeader } from "@/layouts/fsp/FspFinancingCaseOverviewDocumentExchangePageHeader";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";

type Props = {
  params: Promise<{ financingCaseId: string }>;
};

export const metadata: Metadata = {
  title: `Dokumente | ${Constants.companyName}`,
};

export default async function OperationsProvideDocumentsPage({
  params,
}: Props) {
  const t = await getExtracted();
  const { financingCaseId } = await params;

  const { header, flags, documentRequests } = await fetchWithErrorHandling(() =>
    DocumentExchangeService.getRequestsWithDocuments({
      pathVariables: { financingCaseId },
    }),
  );

  return (
    <>
      <FspFinancingCaseOverviewDocumentExchangePageHeader
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
