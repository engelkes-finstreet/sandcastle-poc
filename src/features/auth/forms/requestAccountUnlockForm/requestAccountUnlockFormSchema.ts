import * as z from "@/lib/zod";
import { FormState } from "@finstreet/forms";

export const requestAccountUnlockSchema = z.object({
  email: z.trimmedString().email("E-Mail-Adresse ist ungültig"),
});

export type RequestAccountUnlockType = z.infer<
  typeof requestAccountUnlockSchema
>;
export type RequestAccountUnlockFormState = FormState;
