import * as z from "@/lib/zod";
import { FormConfig } from "@finstreet/forms";
import { DeepPartial } from "@finstreet/forms/rhf";
import { FeedbackCategoryOptions } from "@/features/feedback/forms/submitFeedback/options/useFeedbackCategoryOptions";

export const submitFeedbackSchema = z.object({
  subject: z.trimmedString().min(1).max(100),
  category: z.enum(FeedbackCategoryOptions),
  message: z.trimmedString().min(1).max(2000),
  responseRequested: z.boolean(),
});

/**
 * The subset of the feedback that is repeated in the confirmation modal and sent
 * to the confirmation action once the user confirms.
 */
export const submitFeedbackConfirmationSchema = submitFeedbackSchema.pick({
  subject: true,
  category: true,
});

export type SubmitFeedbackType = z.input<typeof submitFeedbackSchema>;
export type SubmitFeedbackOutputType = z.output<typeof submitFeedbackSchema>;
export type SubmitFeedbackConfirmation = z.output<
  typeof submitFeedbackConfirmationSchema
>;
export type SubmitFeedbackDefaultValues = DeepPartial<SubmitFeedbackType>;
export type SubmitFeedbackFormState = {
  error: string | null;
  message: string | null;
  confirmation: SubmitFeedbackConfirmation | null;
} | null;
export type SubmitFeedbackFormConfig = FormConfig<
  SubmitFeedbackFormState,
  SubmitFeedbackType,
  SubmitFeedbackOutputType
>;
