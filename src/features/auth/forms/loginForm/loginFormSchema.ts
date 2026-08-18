import * as z from "@/lib/zod";
import { FormState } from "@finstreet/forms";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginType = z.infer<typeof loginSchema>;
export type LoginFormState = FormState;
