import { NextResponse } from "next/server";
import { registerMock } from "@/shared/backend/mocks/registry";

type MockLegalRepresentative = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  soleSignatureAuthorized: boolean;
};

type MockState = {
  header: { companyName: string };
  legalRepresentatives: MockLegalRepresentative[];
  flags: {
    confirmable: boolean;
    confirmed: boolean;
    editable: boolean;
  };
};

const state: MockState = {
  header: {
    companyName: "Mustermann Verwaltung GmbH",
  },
  legalRepresentatives: [
    {
      id: "lr-001",
      firstName: "Max",
      lastName: "Mustermann",
      email: "max.mustermann@example.com",
      phoneNumber: "+49 170 1234567",
      soleSignatureAuthorized: true,
    },
    {
      id: "lr-002",
      firstName: "Erika",
      lastName: "Musterfrau",
      email: "erika.musterfrau@example.com",
      phoneNumber: "+49 171 7654321",
      soleSignatureAuthorized: false,
    },
  ],
  flags: {
    confirmable: true,
    confirmed: false,
    editable: true,
  },
};

const buildResponse = () =>
  NextResponse.json({
    data: {
      ...state,
      flags: {
        ...state.flags,
        addable:
          !state.flags.confirmed && state.legalRepresentatives.length < 2,
      },
    },
  });

// GET /financing_cases/{financingCaseId}/legal_representatives
registerMock({
  method: "GET",
  pathPattern: "/financing_cases/{financingCaseId}/legal_representatives",
  handler: () => buildResponse(),
});

// POST /financing_cases/{financingCaseId}/legal_representatives
registerMock({
  method: "POST",
  pathPattern: "/financing_cases/{financingCaseId}/legal_representatives",
  handler: async (req) => {
    const body = await req.json();
    const newRep: MockLegalRepresentative = {
      id: `lr-${Date.now()}`,
      firstName: body.first_name ?? "",
      lastName: body.last_name ?? "",
      email: body.email ?? "",
      phoneNumber: body.phone_number ?? "",
      soleSignatureAuthorized: body.sole_signature_authorized ?? false,
    };
    state.legalRepresentatives.push(newRep);
    return buildResponse();
  },
});

// PUT /financing_cases/{financingCaseId}/legal_representatives/{legalRepresentativeId}
registerMock({
  method: "PUT",
  pathPattern:
    "/financing_cases/{financingCaseId}/legal_representatives/{legalRepresentativeId}",
  handler: async (req, params) => {
    const body = await req.json();
    const index = state.legalRepresentatives.findIndex(
      (r) => r.id === params.legalRepresentativeId,
    );
    if (index !== -1) {
      state.legalRepresentatives[index] = {
        id: params.legalRepresentativeId,
        firstName:
          body.first_name ?? state.legalRepresentatives[index].firstName,
        lastName: body.last_name ?? state.legalRepresentatives[index].lastName,
        email: body.email ?? state.legalRepresentatives[index].email,
        phoneNumber:
          body.phone_number ?? state.legalRepresentatives[index].phoneNumber,
        soleSignatureAuthorized:
          body.sole_signature_authorized ??
          state.legalRepresentatives[index].soleSignatureAuthorized,
      };
    }
    return buildResponse();
  },
});

// DELETE /financing_cases/{financingCaseId}/legal_representatives/{legalRepresentativeId}
registerMock({
  method: "DELETE",
  pathPattern:
    "/financing_cases/{financingCaseId}/legal_representatives/{legalRepresentativeId}",
  handler: (_req, params) => {
    const index = state.legalRepresentatives.findIndex(
      (r) => r.id === params.legalRepresentativeId,
    );
    if (index !== -1) {
      state.legalRepresentatives.splice(index, 1);
    }
    return buildResponse();
  },
});

// POST /financing_cases/{financingCaseId}/legal_representatives/confirm
registerMock({
  method: "POST",
  pathPattern:
    "/financing_cases/{financingCaseId}/legal_representatives/confirm",
  handler: () => {
    state.flags.confirmed = true;
    state.flags.confirmable = false;
    state.flags.editable = false;
    return buildResponse();
  },
});
