import * as z from "@/lib/zod";
import { FormState } from "@finstreet/forms";

export const requestPasswordResetSchema = z.object({
  email: z.trimmedString().email({ message: "E-Mail-Adresse ist ungültig" }),
});

export type RequestPasswordResetType = z.infer<
  typeof requestPasswordResetSchema
>;
export type RequestPasswordResetFormState = FormState;
