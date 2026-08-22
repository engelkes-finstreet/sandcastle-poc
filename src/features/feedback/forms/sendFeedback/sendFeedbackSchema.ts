import * as z from "@/lib/zod";

import { FeedbackCategoryOptions } from "@/features/feedback/forms/sendFeedback/options/useFeedbackCategoryOptions";
import { FormConfig, FormState } from "@finstreet/forms";
import { DeepPartial } from "@finstreet/forms/rhf";

export const sendFeedbackSchema = z.object({
  subject: z.trimmedString().min(1).max(80),
  category: z.enum(FeedbackCategoryOptions),
  message: z.trimmedString().min(20).max(1000),
  responseRequested: z.boolean(),
});

export type SendFeedbackType = z.input<typeof sendFeedbackSchema>;
export type SendFeedbackOutputType = z.output<typeof sendFeedbackSchema>;
export type SendFeedbackFormState = FormState;
export type SendFeedbackFormConfig = FormConfig<
  SendFeedbackFormState,
  SendFeedbackType,
  SendFeedbackOutputType
>;
export type SendFeedbackDefaultValues = DeepPartial<SendFeedbackType>;
