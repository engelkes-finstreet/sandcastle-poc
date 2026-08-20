import { FormConfig, FormState } from "@finstreet/forms";
import { DeepPartial } from "react-hook-form";

import * as z from "@/lib/zod";

export enum FeedbackCategory {
  BUG = "bug",
  IMPROVEMENT = "improvement",
  OTHER = "other",
}

export const submitFeedbackSchema = z.object({
  subject: z.trimmedString().min(1).max(80),
  category: z.enum(FeedbackCategory),
  message: z.trimmedString().min(20).max(1000),
  responseRequested: z.boolean(),
});

export type SubmitFeedbackType = z.input<typeof submitFeedbackSchema>;
export type SubmitFeedbackOutputType = z.output<typeof submitFeedbackSchema>;
export type SubmitFeedbackFormState = FormState;
export type SubmitFeedbackFormConfig = FormConfig<
  SubmitFeedbackFormState,
  SubmitFeedbackType,
  SubmitFeedbackOutputType
>;
export type SubmitFeedbackDefaultValues = DeepPartial<SubmitFeedbackType>;
