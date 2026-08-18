import * as z from "@/lib/zod";

const SigningGroupSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const CaseManagerCandidateSchema = z.object({
  membershipId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  signingGroup: SigningGroupSchema,
});

export const GetCaseManagerCandidatesResponseSchema = z.array(
  CaseManagerCandidateSchema,
);
export type GetCaseManagerCandidatesResponse = z.infer<
  typeof GetCaseManagerCandidatesResponseSchema
>;

export const GetCaseManagerCandidatesPathVariablesSchema = z.object({
  financingCaseId: z.string(),
});

export const AssignCaseManagerPathVariablesSchema = z.object({
  financingCaseId: z.string(),
});

export const AssignCaseManagerPayloadSchema = z.object({
  assigneeId: z.string(),
});
export type AssignCaseManagerPayload = z.infer<
  typeof AssignCaseManagerPayloadSchema
>;
