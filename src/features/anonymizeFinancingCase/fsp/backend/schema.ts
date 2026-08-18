import * as z from "@/lib/zod";

export const AnonymizeFinancingCaseResponseSchema = z.undefined();

export const AnonymizeFinancingCasePathVariablesSchema = z.object({
  financingCaseId: z.string(),
});

export type AnonymizeFinancingCaseResponseType = z.infer<
  typeof AnonymizeFinancingCaseResponseSchema
>;
