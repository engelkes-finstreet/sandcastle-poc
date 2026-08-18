import { NextResponse } from "next/server";
import { registerMock } from "@/shared/backend/mocks/registry";
import { FinancingCaseOverviewType } from "@/shared/backend/models/fspFinancingCases/schema";

const mockItems: FinancingCaseOverviewType[] = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    createdAt: "2025-11-03T10:00:00Z",
    details: {
      company: "Hausverwaltung Müller GmbH",
      loanAmount: { amount: 250000, displayUnit: "EUR" },
    },
    applicant: { firstName: "Hans", lastName: "Müller" },
    caseManager: { firstName: "Anna", lastName: "Schmidt" },
    status: {
      value: "processing",
      label: "In Bearbeitung",
      steppedProgressStatus: { current: 1, total: 4 },
    },
    internalStatus: {
      value: "documents_requested",
      label: "Unterlagen angefordert",
    },
    caseType: "yellow",
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    createdAt: "2025-11-10T14:30:00Z",
    details: {
      company: "Immobilien Weber AG",
      loanAmount: { amount: 180000, displayUnit: "EUR" },
    },
    applicant: { firstName: "Maria", lastName: "Weber" },
    caseManager: null,
    status: {
      value: "new",
      label: "Neu",
      steppedProgressStatus: { current: 0, total: 4 },
    },
    internalStatus: null,
    caseType: "yellow",
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    createdAt: "2025-12-01T09:15:00Z",
    details: {
      company: "Nordhaus Verwaltung",
      loanAmount: { amount: 420000, displayUnit: "EUR" },
    },
    applicant: { firstName: "Klaus", lastName: "Fischer" },
    caseManager: { firstName: "Tobias", lastName: "Bauer" },
    status: {
      value: "approved",
      label: "Genehmigt",
      steppedProgressStatus: { current: 4, total: 4 },
    },
    internalStatus: {
      value: "contract_signed",
      label: "Vertrag unterzeichnet",
    },
    caseType: "green",
  },
  {
    id: "d4e5f6a7-b8c9-0123-defa-234567890123",
    createdAt: "2025-12-08T11:45:00Z",
    details: {
      company: "Süd Immobilien GmbH",
      loanAmount: { amount: 310000, displayUnit: "EUR" },
    },
    applicant: { firstName: "Petra", lastName: "Hoffmann" },
    caseManager: { firstName: "Lars", lastName: "König" },
    status: {
      value: "documents_pending",
      label: "Dokumente ausstehend",
      steppedProgressStatus: { current: 2, total: 4 },
    },
    internalStatus: {
      value: "waiting_for_applicant",
      label: "Wartet auf Antragsteller",
    },
    caseType: "green",
  },
  {
    id: "e5f6a7b8-c9d0-1234-efab-345678901234",
    createdAt: "2025-10-20T08:00:00Z",
    details: {
      company: "Oststadt Verwaltung KG",
      loanAmount: { amount: 95000, displayUnit: "EUR" },
    },
    applicant: { firstName: "Rolf", lastName: "Braun" },
    caseManager: { firstName: "Sabine", lastName: "Meier" },
    status: {
      value: "rejected",
      label: "Abgelehnt",
      steppedProgressStatus: { current: 0, total: 4 },
    },
    internalStatus: {
      value: "insufficient_documents",
      label: "Unterlagen unvollständig",
    },
    caseType: "yellow",
  },
];

// GET /financial_service_providers/financing_cases
registerMock({
  method: "GET",
  pathPattern: "/financial_service_providers/financing_cases",
  handler: (req) => {
    const url = new URL(req.url);
    const search = url.searchParams.get("q[search_term]") ?? "";

    let items = [...mockItems];

    if (search) {
      const query = decodeURIComponent(search).toLowerCase();
      items = items.filter(
        (item) =>
          item.details.company.toLowerCase().includes(query) ||
          item.applicant.firstName.toLowerCase().includes(query) ||
          item.applicant.lastName.toLowerCase().includes(query),
      );
    }

    return NextResponse.json({
      data: {
        response: items,
        meta: { pagination: { page: 1, count: items.length } },
      },
    });
  },
});
