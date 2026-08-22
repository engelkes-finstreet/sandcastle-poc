type LoginParams =
  | "passwordResetSuccess"
  | "inquirySubmissionSuccess"
  | "confirmMarketingAgreement";
type FinancingCaseListParams = "inquirySubmissionSuccess";
type RequestPasswordResetParams = "requestSuccess";

function buildPathWithParams<Params>(defaultPath: string, param?: Params) {
  if (param) {
    return `${defaultPath}?${param}=true`;
  }

  return defaultPath;
}

export const routes = {
  root: "/",
  notAllowed: "/notAllowed",
  loginPasswordResetSuccess: "/anmelden?passwordResetSuccess=true",
  resetPassword: "/passwort-zuruecksetzen",
  requestPasswordReset: "/passwort-vergessen",
  requestPasswordResetSuccess: "/passwort-vergessen?requestSuccess=true",
  loginConfirmMarketingAgreement: "/anmelden?confirmMarketingAgreement=true",
  unlockAccount: "/konto-entsperren",
  requestAccountUnlock: "/konto-entsperrung-anfordern",
  forbidden: "/zugriff-verweigert",
  auth: {
    login: (loginParam?: LoginParams) =>
      buildPathWithParams<LoginParams>("/anmelden", loginParam),
    requestPasswordReset: (
      requestPasswordResetParam?: RequestPasswordResetParams,
    ) =>
      buildPathWithParams<RequestPasswordResetParams>(
        "/passwort-vergessen",
        requestPasswordResetParam,
      ),
  },
  admin: {
    members: {
      index: "/admin/benutzer",
      substitutes: (membershipId: string) => `/admin/benutzer/${membershipId}`,
    },
    feedback: {
      index: "/admin/feedback",
    },
  },
  // TODO(boilerplate): Rename this "customer" key and its URL prefixes (/kunde/...)
  // to match the user group in your domain. Keep in sync with:
  // - src/shared/types/Portal.ts
  // - src/shared/auth/roleConfig.ts (allowedPaths)
  // - Any component using usePortal() that checks portal === "customer"
  customer: {
    members: {
      index: "/kunde/benutzer",
    },
    financingCase: {
      overview: (id: string) => `/kunde/factoring-antraege/${id}`,
      legalRepresentatives: (id: string) =>
        `/kunde/factoring-antraege/${id}/vertretungsberechtigte`,
      list: (params?: FinancingCaseListParams) =>
        buildPathWithParams("/kunde/factoring-antraege", params),
      inquiryDetails: (id: string) => `/kunde/factoring-antraege/${id}/anfrage`,
      documents: (id: string) => `/kunde/factoring-antraege/${id}/dokumente`,
    },
  },
  fsp: {
    substitutes: {
      index: "/operations/vertretungen",
    },
    financingCase: {
      overview: (id: string) => `/operations/factoring-antraege/${id}`,
      legalRepresentatives: (id: string) =>
        `/operations/factoring-antraege/${id}/vertretungsberechtigte`,
      list: (params?: FinancingCaseListParams) =>
        buildPathWithParams("/operations/factoring-antraege", params),
      documents: (id: string) =>
        `/operations/factoring-antraege/${id}/dokumente`,
      inquiryDetails: (id: string) =>
        `/operations/factoring-antraege/${id}/anfrage-details`,
    },
  },
};
