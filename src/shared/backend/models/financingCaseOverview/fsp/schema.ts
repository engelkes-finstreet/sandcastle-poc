import * as z from "@/lib/zod";

const StatusSchema = z.object({
  value: z.string(),
  label: z.string(),
  steppedProgressStatus: z.object({
    current: z.number(),
    total: z.number(),
  }),
});

const InternalStatusSchema = z
  .object({
    value: z.string(),
    label: z.string(),
  })
  .nullable();

const ProvidedDocumentSchema = z.object({
  title: z.string(),
  documentId: z.string(),
  providedAt: z.string(),
});

const InternalDocumentSchema = z.object({
  title: z.string(),
  documentId: z.string(),
  providedAt: z.string(),
});

const FlagSchema = z.object({
  mutable: z.boolean(),
  archivable: z.boolean(),
  userAnonymizable: z.boolean(),
});

export const GetFspFinancingCaseOverviewResponseSchema = z.object({
  header: z.object({
    company: z.string(),
    loanAmount: z.object({
      amount: z.number(),
      displayUnit: z.string(),
    }),
    submittedAt: z.string().nullable(),
  }),
  status: StatusSchema,
  internalStatus: InternalStatusSchema,
  internalRemark: z.string().nullable(),
  internalDocuments: z.array(InternalDocumentSchema),
  flags: FlagSchema,
  verifyInquiry: z.object({
    inquiry: z.object({
      completed: z.boolean(),
    }),
    contractCompletion: z.object({
      completed: z.boolean(),
      legalRepresentativesConfirm: z.boolean(),
    }),
    customerDocuments: z.object({
      completedCount: z.number(),
      totalCount: z.number(),
    }),
  }),
  onboarding: z.object({
    documentsForCustomer: z.object({
      providedDocuments: z.array(ProvidedDocumentSchema),
    }),
  }),
});

export type GetFspFinancingCaseOverviewResponseType = z.infer<
  typeof GetFspFinancingCaseOverviewResponseSchema
>;

export const GetFspFinancingCaseOverviewPathVariablesSchema = z.object({
  financingCaseId: z.string(),
});

export type FspFinancingCaseOverviewFlagsType = z.infer<typeof FlagSchema>;
