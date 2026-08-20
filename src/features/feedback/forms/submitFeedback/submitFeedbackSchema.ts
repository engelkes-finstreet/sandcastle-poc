import * as z from "@/lib/zod";

import { FormConfig, FormState } from "@finstreet/forms";
import { DeepPartial } from "@finstreet/forms/rhf";

export const feedbackCategories = ["bug", "improvement", "other"] as const;

export type FeedbackCategory = (typeof feedbackCategories)[number];

export const submitFeedbackSchema = z.object({
  subject: z.trimmedString().min(1).max(80),
  category: z.enum(feedbackCategories),
  message: z.trimmedString().min(20).max(1000),
  responseRequested: z.boolean(),
});

export type SubmitFeedbackFormType = z.input<typeof submitFeedbackSchema>;
export type SubmitFeedbackFormOutputType = z.output<
  typeof submitFeedbackSchema
>;
export type SubmitFeedbackFormState = FormState;
export type SubmitFeedbackFormConfig = FormConfig<
  SubmitFeedbackFormState,
  SubmitFeedbackFormType,
  SubmitFeedbackFormOutputType
>;
export type SubmitFeedbackDefaultValues = DeepPartial<SubmitFeedbackFormType>;
