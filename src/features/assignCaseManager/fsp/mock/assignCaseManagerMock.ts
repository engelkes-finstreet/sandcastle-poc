import { registerMock } from "@/shared/backend/mocks/registry";
import { NextResponse } from "next/server";
import {
  AssignCaseManagerPayload,
  GetCaseManagerCandidatesResponse,
} from "@/features/assignCaseManager/fsp/backend/schema";

const caseManagerCandidates: GetCaseManagerCandidatesResponse = [
  {
    membershipId: "mock-membership-1",
    firstName: "Anna",
    lastName: "Schmidt",
    signingGroup: { value: "group_a", label: "Gruppe A" },
  },
  {
    membershipId: "mock-membership-2",
    firstName: "Tobias",
    lastName: "Bauer",
    signingGroup: { value: "group_a", label: "Gruppe A" },
  },
  {
    membershipId: "mock-membership-3",
    firstName: "Sabine",
    lastName: "Meier",
    signingGroup: { value: "group_b", label: "Gruppe B" },
  },
  {
    membershipId: "mock-membership-4",
    firstName: "Lars",
    lastName: "König",
    signingGroup: { value: "group_b", label: "Gruppe B" },
  },
  {
    membershipId: "mock-membership-5",
    firstName: "Christine",
    lastName: "Bergmann",
    signingGroup: { value: "group_c", label: "Gruppe C" },
  },
];

registerMock({
  method: "GET",
  pathPattern: "/financing_cases/{financingCaseId}/case_managers/candidates",
  handler: () => {
    return NextResponse.json({ data: caseManagerCandidates });
  },
});

registerMock({
  method: "POST",
  pathPattern: "/financing_cases/{financingCaseId}/case_managers/assign",
  handler: async (req, _params) => {
    const body: AssignCaseManagerPayload = await req.json();
    const candidate = caseManagerCandidates.find(
      (c) => c.membershipId === body.assigneeId,
    );
    void candidate;
    return new NextResponse(null, { status: 200 });
  },
});
