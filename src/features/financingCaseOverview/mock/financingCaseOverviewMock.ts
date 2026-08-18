import { NextResponse } from "next/server";
import { registerMock } from "@/shared/backend/mocks/registry";
import { GetFspFinancingCaseOverviewResponseType } from "@/shared/backend/models/financingCaseOverview/fsp/schema";

const defaultOverview: GetFspFinancingCaseOverviewResponseType = {
  header: {
    company: "Dummy GmbH",
    loanAmount: {
      amount: 500000,
      displayUnit: "EUR",
    },
    submittedAt: "2025-01-15T10:00:00Z",
  },
  status: {
    value: "in_review",
    label: "In Prüfung",
    steppedProgressStatus: {
      current: 2,
      total: 5,
    },
  },
  internalStatus: {
    value: "documents_requested",
    label: "Dokumente angefordert",
  },
  internalRemark: "Dies ist eine interne Bemerkung zum Antrag.",
  internalDocuments: [
    {
      title: "Liste der Gesellschafter",
      documentId: "int-doc-001",
      providedAt: "05-05-2024",
    },
    {
      title: "Gesellschaftsvertrag",
      documentId: "int-doc-002",
      providedAt: "05-05-2024",
    },
    {
      title: "Chronologischer Druck",
      documentId: "int-doc-003",
      providedAt: "05-05-2024",
    },
    {
      title: "KYC Dokumente",
      documentId: "int-doc-004",
      providedAt: "05-05-2024",
    },
    {
      title: "Crefo Bericht (Kompaktauskunft)",
      documentId: "int-doc-005",
      providedAt: "05-05-2024",
    },
    {
      title: "Crefo Bericht (Ampelauskunnft)",
      documentId: "int-doc-006",
      providedAt: "05-05-2024",
    },
    {
      title: "Crefo Bericht (Kurzauskunft)",
      documentId: "int-doc-007",
      providedAt: "05-05-2024",
    },
  ],
  flags: {
    mutable: true,
    archivable: true,
    userAnonymizable: false,
  },
  verifyInquiry: {
    inquiry: {
      completed: true,
    },
    contractCompletion: {
      completed: true,
      legalRepresentativesConfirm: true,
    },
    customerDocuments: {
      completedCount: 3,
      totalCount: 6,
    },
  },
  onboarding: {
    documentsForCustomer: {
      providedDocuments: [
        {
          title: "Factoring-Vertrag",
          documentId: "doc-001",
          providedAt: "2024-05-05",
        },
        {
          title: "Allgemeine Geschäftsbedingungen",
          documentId: "doc-002",
          providedAt: "2024-05-05",
        },
      ],
    },
  },
};

const store: Record<string, GetFspFinancingCaseOverviewResponseType> = {};

export function getOrCreate(
  financingCaseId: string,
): GetFspFinancingCaseOverviewResponseType {
  store[financingCaseId] ??= {
    ...defaultOverview,
    header: {
      ...defaultOverview.header,
      company: `Dummy GmbH (${financingCaseId})`,
    },
  };
  return store[financingCaseId];
}

registerMock({
  method: "GET",
  pathPattern:
    "/financial_service_providers/financing_cases/{financingCaseId}/overview",
  handler: (_req, params) => {
    const data = getOrCreate(params.financingCaseId);
    return NextResponse.json({ data });
  },
});
