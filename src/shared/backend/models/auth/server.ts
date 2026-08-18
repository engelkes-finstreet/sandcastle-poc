import * as z from "@/lib/zod";
import { EndpointConfig } from "@finstreet/secure-fetch";
import { createServerFetchFunction } from "@/shared/backend/createServerFetchFunction";

export const InvitationPreviewSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  status: z.enum(["pending", "active", "withdrawn"]),
});

export type InvitationPreviewType = z.infer<typeof InvitationPreviewSchema>;

const previewInvitationConfig = {
  protected: false,
  method: "GET",
  path: "/invitations/preview?token={token}",
  pathVariablesSchema: z.object({
    token: z.string(),
  }),
  resultSchema: InvitationPreviewSchema,
} satisfies EndpointConfig;

export const previewInvitation = createServerFetchFunction(
  previewInvitationConfig,
);

const resetPasswordConfig = {
  protected: false,
  method: "PATCH",
  path: "/user/reset_password",
  payloadSchema: z.object({
    password: z.string(),
    passwordResetToken: z.string(),
  }),
} satisfies EndpointConfig;

export const resetPassword = createServerFetchFunction(resetPasswordConfig);

const requestPasswordResetConfig = {
  protected: false,
  method: "POST",
  path: "/user/request_password_reset",
  payloadSchema: z.object({
    email: z.string().email(),
  }),
} satisfies EndpointConfig;

export const requestPasswordReset = createServerFetchFunction(
  requestPasswordResetConfig,
);

const unlockAccountConfig = {
  protected: false,
  method: "PATCH",
  path: "/user/unlock",
  payloadSchema: z.object({
    unlockToken: z.string(),
  }),
} satisfies EndpointConfig;

export const unlockAccount = createServerFetchFunction(unlockAccountConfig);

const requestAccountUnlockConfig = {
  protected: false,
  method: "POST",
  path: "/user/request_unlock",
  payloadSchema: z.object({
    email: z.string().email(),
  }),
} satisfies EndpointConfig;

export const requestAccountUnlock = createServerFetchFunction(
  requestAccountUnlockConfig,
);

export const AcceptInvitationPayloadSchema = z.object({
  token: z.string(),
  user: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    password: z.string(),
  }),
});

export type AcceptInvitationPayloadType = z.infer<
  typeof AcceptInvitationPayloadSchema
>;

const acceptInvitationConfig = {
  protected: false,
  method: "POST",
  path: "/invitations/accept",
  payloadSchema: AcceptInvitationPayloadSchema,
} satisfies EndpointConfig;

export const acceptInvitation = createServerFetchFunction(
  acceptInvitationConfig,
);
