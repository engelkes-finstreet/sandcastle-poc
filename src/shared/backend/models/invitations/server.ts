import * as z from "@/lib/zod";
import { EndpointConfig } from "@finstreet/secure-fetch";
import { createServerFetchFunction } from "@/shared/backend/createServerFetchFunction";

// Withdraw invitation endpoint
const withdrawInvitationConfig = {
  protected: true,
  method: "POST",
  path: "/invitations/{id}/withdraw",
  pathVariablesSchema: z.object({
    id: z.string(),
  }),
} satisfies EndpointConfig;

export const withdrawInvitation = createServerFetchFunction(
  withdrawInvitationConfig,
);

// Resend invitation endpoint
const resendInvitationConfig = {
  protected: true,
  method: "POST",
  path: "/invitations/{id}/resend",
  pathVariablesSchema: z.object({
    id: z.string(),
  }),
} satisfies EndpointConfig;

export const resendInvitation = createServerFetchFunction(
  resendInvitationConfig,
);
