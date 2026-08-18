import * as z from "@/lib/zod";

const LoanAmountSchema = z.object({
  amount: z.number(),
  displayUnit: z.string(),
});

const FinancingCaseOverviewSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  details: z.object({
    company: z.string(),
    loanAmount: LoanAmountSchema.optional(),
  }),
  applicant: z.object({
    firstName: z.string(),
    lastName: z.string(),
  }),
  caseManager: z
    .object({
      firstName: z.string(),
      lastName: z.string(),
    })
    .nullable()
    .optional(),
  status: z.object({
    value: z.string(),
    label: z.string(),
    steppedProgressStatus: z.object({
      current: z.number(),
      total: z.number(),
    }),
  }),
  internalStatus: z
    .object({
      value: z.string(),
      label: z.string(),
    })
    .nullable()
    .optional(),
  caseType: z.enum(["green", "yellow"]),
});

export const GetFspFinancingCasesResponseSchema = z.object({
  response: z.array(FinancingCaseOverviewSchema),
  meta: z.object({
    pagination: z.object({
      page: z.number(),
      count: z.number(),
    }),
  }),
});

export type GetFspFinancingCasesResponseType = z.infer<
  typeof GetFspFinancingCasesResponseSchema
>;

export type FinancingCaseOverviewType = z.infer<
  typeof FinancingCaseOverviewSchema
>;
