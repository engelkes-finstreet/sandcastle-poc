import { EndpointConfig } from "@finstreet/secure-fetch";
import {
  GetDepartmentOptionsResponseSchema,
  GetDepartmentOptionsResponseType,
  GetSigningGroupOptionsResponseSchema,
  GetSigningGroupOptionsResponseType,
} from "./schema";
import { createServerFetchFunction } from "@/shared/backend/createServerFetchFunction";
import * as z from "@/lib/zod";

// Get department options endpoint configuration
const getDepartmentOptionsConfig = {
  protected: true,
  method: "GET",
  path: "/memberships/department/options",
  resultSchema: GetDepartmentOptionsResponseSchema,
} satisfies EndpointConfig;

export const getDepartmentOptions = createServerFetchFunction(
  getDepartmentOptionsConfig,
);

// Get signing group options endpoint configuration
const getSigningGroupOptionsConfig = {
  protected: true,
  method: "GET",
  path: "/memberships/signing_group/options",
  resultSchema: GetSigningGroupOptionsResponseSchema,
} satisfies EndpointConfig;

export const getSigningGroupOptions = createServerFetchFunction(
  getSigningGroupOptionsConfig,
);

// Revoke membership endpoint configuration
const revokeMembershipConfig = {
  protected: true,
  method: "POST",
  path: "/memberships/{id}/revoke",
  pathVariablesSchema: z.object({
    id: z.string(),
  }),
} satisfies EndpointConfig;

export const revokeMembership = createServerFetchFunction(
  revokeMembershipConfig,
);

// Export types for convenience
export type {
  GetDepartmentOptionsResponseType,
  GetSigningGroupOptionsResponseType,
};
