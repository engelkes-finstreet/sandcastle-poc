import { NextResponse } from "next/server";
import { registerMock } from "@/shared/backend/mocks/registry";
import { getOrCreate } from "@/features/financingCaseOverview/mock/financingCaseOverviewMock";

// POST /financial_service_providers/financing_cases/{financingCaseId}/anonymize
registerMock({
  method: "POST",
  pathPattern:
    "/financial_service_providers/financing_cases/{financingCaseId}/anonymize",
  handler: (_req, params) => {
    const overview = getOrCreate(params.financingCaseId);
    overview.flags.userAnonymizable = true;
    overview.flags.mutable = false;
    overview.flags.archivable = false;
    overview.status.label = "Anonymisiert";
    overview.status.value = "userAnonymised";
    overview.status.steppedProgressStatus.current = 5;
    overview.status.steppedProgressStatus.total = 5;
    return new NextResponse(null, { status: 204 });
  },
});
