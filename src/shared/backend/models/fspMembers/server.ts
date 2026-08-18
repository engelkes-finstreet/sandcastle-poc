import { EndpointConfig } from "@finstreet/secure-fetch";
import {
  createPaginatedServerFetchFunction,
  createServerFetchFunction,
} from "@/shared/backend/createServerFetchFunction";
import {
  GetFspMembersPaginatedSchema,
  GetPendingInvitationsPaginatedSchema,
  InviteMemberRequestSchema,
  UpdateMemberRolesPathVariablesSchema,
  UpdateMemberRolesPayloadSchema,
} from "./schema";

const getFspMembersConfig = (path: string) => {
  return {
    protected: true,
    method: "GET",
    path,
    resultSchema: GetFspMembersPaginatedSchema,
  } satisfies EndpointConfig;
};

export const getFspMembers = (path: string) =>
  createPaginatedServerFetchFunction(getFspMembersConfig(path));

const getPendingInvitationsConfig = (path: string) => {
  return {
    protected: true,
    method: "GET",
    path,
    resultSchema: GetPendingInvitationsPaginatedSchema,
  } satisfies EndpointConfig;
};

export const getPendingInvitations = (path: string) =>
  createPaginatedServerFetchFunction(getPendingInvitationsConfig(path));

const inviteMemberConfig = {
  protected: true,
  method: "POST",
  path: "/financial_service_provider/invitations/invite",
  payloadSchema: InviteMemberRequestSchema,
} satisfies EndpointConfig;

export const inviteMember = createServerFetchFunction(inviteMemberConfig);

const updateMemberRolesConfig = {
  protected: true,
  method: "PATCH",
  path: "/memberships/{id}/update_roles",
  pathVariablesSchema: UpdateMemberRolesPathVariablesSchema,
  payloadSchema: UpdateMemberRolesPayloadSchema,
} satisfies EndpointConfig;

export const updateMemberRoles = createServerFetchFunction(
  updateMemberRolesConfig,
);
