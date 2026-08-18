import { registerMock } from "@/shared/backend/mocks/registry";
import { NextResponse } from "next/server";
import {
  GetArchiveOptionsResponse,
  ArchiveFinancingCasePayload,
} from "@/features/archiveFinancingCase/fsp/backend/schema";
import { getOrCreate } from "@/features/financingCaseOverview/mock/financingCaseOverviewMock";

const archiveOptions: GetArchiveOptionsResponse = [
  { value: "duplicate", label: "Doppelter Antrag" },
  { value: "incomplete", label: "Unvollständige Unterlagen" },
  { value: "customer_request", label: "Kundenwunsch" },
  { value: "credit_check_failed", label: "Kreditprüfung negativ" },
  { value: "other", label: "Sonstiger Grund" },
];

registerMock({
  method: "GET",
  pathPattern: "/financial_service_providers/financing_cases/archival/options",
  handler: () => {
    return NextResponse.json({ data: archiveOptions });
  },
});

registerMock({
  method: "POST",
  pathPattern:
    "/financial_service_providers/financing_cases/{financingCaseId}/archive",
  handler: async (req, params) => {
    const _body: ArchiveFinancingCasePayload = await req.json();
    const entry = getOrCreate(params.financingCaseId);
    entry.status.label = "Archiviert";
    entry.status.value = "archived";
    entry.flags.userAnonymizable = true;
    entry.flags.mutable = true;
    entry.flags.archivable = false;
    entry.status.steppedProgressStatus.total = 5;
    entry.status.steppedProgressStatus.current = 5;
    return new NextResponse(null, { status: 200 });
  },
});
