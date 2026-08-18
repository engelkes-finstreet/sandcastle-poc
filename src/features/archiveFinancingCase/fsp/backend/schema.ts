import * as z from "@/lib/zod";

const ArchiveOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const GetArchiveOptionsResponseSchema = z.array(ArchiveOptionSchema);
export type GetArchiveOptionsResponse = z.infer<
  typeof GetArchiveOptionsResponseSchema
>;

export const ArchiveFinancingCasePathVariablesSchema = z.object({
  financingCaseId: z.string(),
});

export const ArchiveFinancingCasePayloadSchema = z.object({
  reason: z.string(),
});
export type ArchiveFinancingCasePayload = z.infer<
  typeof ArchiveFinancingCasePayloadSchema
>;
