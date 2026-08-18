import * as z from "@/lib/zod";

const LegalRepresentativeSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  soleSignatureAuthorized: z.boolean(),
});

export type LegalRepresentative = z.infer<typeof LegalRepresentativeSchema>;

const LegalRepresentativesHeaderSchema = z.object({
  companyName: z.string(),
});

export type LegalRepresentativesHeaderType = z.infer<
  typeof LegalRepresentativesHeaderSchema
>;

const LegalRepresentativesFlagsSchema = z.object({
  confirmable: z.boolean(),
  confirmed: z.boolean(),
  editable: z.boolean(),
  addable: z.boolean(),
});

export type LegalRepresentativesFlagsType = z.infer<
  typeof LegalRepresentativesFlagsSchema
>;

export const GetLegalRepresentativesResponseSchema = z.object({
  header: LegalRepresentativesHeaderSchema,
  legalRepresentatives: z.array(LegalRepresentativeSchema),
  flags: LegalRepresentativesFlagsSchema,
});

export type GetLegalRepresentativesResponseType = z.infer<
  typeof GetLegalRepresentativesResponseSchema
>;

export const PostLegalRepresentativeRequestSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  soleSignatureAuthorized: z.boolean(),
});

export type PostLegalRepresentativeRequestType = z.infer<
  typeof PostLegalRepresentativeRequestSchema
>;

export const LegalRepresentativesPathVariablesSchema = z.object({
  financingCaseId: z.string(),
});

export type LegalRepresentativesPathVariablesType = z.infer<
  typeof LegalRepresentativesPathVariablesSchema
>;

export const LegalRepresentativePathVariablesSchema = z.object({
  financingCaseId: z.string(),
  legalRepresentativeId: z.string(),
});

export type LegalRepresentativePathVariablesType = z.infer<
  typeof LegalRepresentativePathVariablesSchema
>;
