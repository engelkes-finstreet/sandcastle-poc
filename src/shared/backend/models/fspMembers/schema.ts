import * as z from "@/lib/zod";
import { MetaSchema } from "@/shared/backend/models/common/meta";
import {
  DepartmentSchema,
  SigningGroupSchema,
} from "@/shared/backend/models/memberships/schema";

// Enums based on the API specification
export const MemberStatusSchema = z.enum([
  "active",
  "deactivated",
  "invited",
  "revoked",
]);

export type MemberStatusType = z.infer<typeof MemberStatusSchema>;

export const MemberRoleSchema = z.enum([
  "Administration::Admin",
  "PropertyManagement::PropertyManager",
  "PropertyManagement::Scalara",
  "PropertyManagement::Admin",
  "FinancialServiceProvider::Admin",
  "FinancialServiceProvider::Processor",
  "FinancialServiceProvider::MasterDataManager",
]);

export const DepartmentObjectSchema = z.object({
  value: DepartmentSchema,
  label: z.string(),
});

export type DepartmentObjectType = z.infer<typeof DepartmentObjectSchema>;

export const SigningGroupObjectSchema = z.object({
  value: SigningGroupSchema,
  label: z.string(),
});

export type SigningGroupObjectType = z.infer<typeof SigningGroupObjectSchema>;

export type MemberRoleType = z.infer<typeof MemberRoleSchema>;

// Base member schema without substitute field (used for nested substitute objects)
export const BaseFspMemberSchema = z.object({
  id: z.string(),
  status: MemberStatusSchema,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  roles: z.array(MemberRoleSchema),
  department: DepartmentObjectSchema,
  signingGroup: SigningGroupObjectSchema,
});

export type BaseFspMemberType = z.infer<typeof BaseFspMemberSchema>;

// Main member schema with substitute field
export const FspMemberSchema = BaseFspMemberSchema.extend({
  substitute: BaseFspMemberSchema.nullable(),
});

export type FspMemberType = z.infer<typeof FspMemberSchema>;

// Response schema for the list endpoint
export const GetFspMembersResponseSchema = z.array(FspMemberSchema);

export type GetFspMembersResponseType = z.infer<
  typeof GetFspMembersResponseSchema
>;

// Paginated response schema
export const GetFspMembersPaginatedSchema = z.object({
  response: GetFspMembersResponseSchema,
  meta: MetaSchema,
});

export type GetFspMembersPaginatedType = z.infer<
  typeof GetFspMembersPaginatedSchema
>;

const InvitedBySchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// Invitation schema
const InvitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: z.string(),
  acceptedAt: z.string().nullable(),
  firstSentAt: z.string(),
  lastSentAt: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  roles: z.array(MemberRoleSchema),
  invitedBy: InvitedBySchema,
  organization: OrganizationSchema,
  department: DepartmentObjectSchema,
  signingGroup: SigningGroupObjectSchema,
});

export type InvitationType = z.infer<typeof InvitationSchema>;

// Response schema for pending invitations
export const GetPendingInvitationsResponseSchema = z.array(InvitationSchema);

export type GetPendingInvitationsResponseType = z.infer<
  typeof GetPendingInvitationsResponseSchema
>;

// Paginated response schema for pending invitations
export const GetPendingInvitationsPaginatedSchema = z.object({
  response: GetPendingInvitationsResponseSchema,
  meta: MetaSchema,
});

export type GetPendingInvitationsPaginatedType = z.infer<
  typeof GetPendingInvitationsPaginatedSchema
>;

// Invite member request schema
export const InviteMemberRequestSchema = z.object({
  email: z.string(),
  roles: z.array(MemberRoleSchema),
  firstName: z.string(),
  lastName: z.string(),
  department: DepartmentSchema,
  signingGroup: SigningGroupSchema,
});

export type InviteMemberRequestType = z.infer<typeof InviteMemberRequestSchema>;

// Update member roles schemas
export const UpdateMemberRolesPathVariablesSchema = z.object({
  id: z.string(),
});

export type UpdateMemberRolesPathVariablesType = z.infer<
  typeof UpdateMemberRolesPathVariablesSchema
>;

export const UpdateMemberRolesPayloadSchema = z.object({
  roles: z.array(MemberRoleSchema),
});

export type UpdateMemberRolesPayloadType = z.infer<
  typeof UpdateMemberRolesPayloadSchema
>;
