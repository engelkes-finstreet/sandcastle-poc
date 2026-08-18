import { EndpointConfig } from "@finstreet/secure-fetch";
import * as z from "@/lib/zod";
import { createServerFetchFunction } from "@/shared/backend/createServerFetchFunction";

const ConfirmMarketingAgreementSchema = z.object({
  token: z.string(),
});

export type ConfirmMarketingAgreementType = z.infer<
  typeof ConfirmMarketingAgreementSchema
>;

const confirmMarketingAgreementConfig = {
  protected: false,
  method: "POST",
  path: "/agreeables/marketing_agreements/confirm_acceptance",
  payloadSchema: ConfirmMarketingAgreementSchema,
} satisfies EndpointConfig;

export const confirmMarketingAgreement = createServerFetchFunction(
  confirmMarketingAgreementConfig,
);
