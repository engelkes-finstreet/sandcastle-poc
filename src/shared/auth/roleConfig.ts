import { routes } from "@/routes";
import { MemberRole } from "@/shared/backend/models/auth/schema";

/**
 * Central configuration for all role-based permissions and redirects.
 * For each role, defines:
 * - defaultRedirect: Where to send the user when they hit the root path (/)
 * - allowedPaths: Which base paths the role has permission to access
 */
// TODO(boilerplate): Add an entry for every role your application uses.
// For each role, set the correct defaultRedirect and the allowedPaths that
// match the route prefixes defined in src/routes.ts.
export const roleConfig: Record<
  MemberRole,
  { defaultRedirect: string; allowedPaths: string[] }
> = {
  // TODO(boilerplate): Update allowedPaths to match your renamed customer route prefix.
  "FinancialServiceProvider::Admin": {
    defaultRedirect: routes.admin.members.index,
    allowedPaths: ["/admin"],
  },
  "PropertyManagement::PropertyManager": {
    defaultRedirect: routes.customer.financingCase.list(),
    allowedPaths: ["/kunde"],
  },
  "PropertyManagement::Scalara": {
    defaultRedirect: routes.customer.financingCase.list(),
    allowedPaths: ["/kunde"],
  },
  "FinancialServiceProvider::Processor": {
    defaultRedirect: routes.fsp.financingCase.list(),
    allowedPaths: ["/operations"],
  },
  "FinancialServiceProvider::MasterDataManager": {
    defaultRedirect: routes.fsp.financingCase.list(),
    allowedPaths: ["/operations"],
  },
  "Administration::Admin": {
    defaultRedirect: routes.admin.members.index,
    allowedPaths: ["/admin"],
  },
  "PropertyManagement::Admin": {
    defaultRedirect: routes.customer.financingCase.list(),
    allowedPaths: ["/kunde"],
  },
};
