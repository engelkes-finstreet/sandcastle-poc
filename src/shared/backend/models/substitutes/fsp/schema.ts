import * as z from "@/lib/zod";
import { BaseFspMemberSchema } from "@/shared/backend/models/fspMembers/schema";

const SubstitutionMembershipSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

// Result schema for GET /api/internal/membership/substitutions
export const SubstitutionsSchema = z.object({
  membership: SubstitutionMembershipSchema.nullable(),
  substitute: BaseFspMemberSchema.nullable(),
  representing: z.array(BaseFspMemberSchema),
  hasSubstitute: z.boolean(),
  isSubstituting: z.boolean(),
});

const SubstituteCandidateSchema = BaseFspMemberSchema.extend({
  roleNames: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    }),
  ),
});

export type Substitutions = z.infer<typeof SubstitutionsSchema>;

// Payload schema for PUT /api/internal/membership/substitute
export const SetSubstitutePayloadSchema = z.object({
  substituteId: z.string().uuid(),
});

export type SetSubstitutePayload = z.infer<typeof SetSubstitutePayloadSchema>;

// Result schema for GET /api/internal/membership/substitute/candidates
export const SubstituteCandidatesSchema = z.array(SubstituteCandidateSchema);

export type SubstituteCandidates = z.infer<typeof SubstituteCandidatesSchema>;

// Path variables schema for PUT /api/internal/memberships/{membership_id}/substitute
export const SetMembershipSubstitutePathVariablesSchema = z.object({
  membershipId: z.string(),
});

export type SetMembershipSubstitutePathVariables = z.infer<
  typeof SetMembershipSubstitutePathVariablesSchema
>;

// Path variables schema for GET /api/internal/memberships/{membership_id}/substitute/candidates
export const GetMembershipSubstituteCandidatesPathVariablesSchema = z.object({
  membershipId: z.string(),
});

export type GetMembershipSubstituteCandidatesPathVariables = z.infer<
  typeof GetMembershipSubstituteCandidatesPathVariablesSchema
>;

// Result schema for GET /api/internal/memberships/{membership_id}/substitute/candidates
export const MembershipSubstituteCandidatesSchema = z.array(
  SubstituteCandidateSchema,
);

export type MembershipSubstituteCandidates = z.infer<
  typeof MembershipSubstituteCandidatesSchema
>;
