import * as z from "@/lib/zod";
import { FormState } from "@finstreet/forms";

export const setNewPasswordSchema = z.object({
  password: z.trimmedString().min(1, "Password is required"),
});

export type SetNewPasswordType = z.infer<typeof setNewPasswordSchema>;
export type SetNewPasswordFormState = FormState;
