"use server";

import { redirect } from "next/navigation";
import {
  RequestAccountUnlockType,
  RequestAccountUnlockFormState,
} from "@/features/auth/forms/requestAccountUnlockForm/requestAccountUnlockFormSchema";
import { routes } from "@/routes";
import { requestAccountUnlock } from "@/shared/backend/models/auth/server";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";

export async function requestAccountUnlockFormAction(
  state: RequestAccountUnlockFormState,
  { email }: RequestAccountUnlockType,
): Promise<RequestAccountUnlockFormState> {
  const result = await requestAccountUnlock({
    payload: {
      email,
    },
  });

  if (result.success) {
    redirect(routes.auth.login());
  } else {
    return handleFormRequestError(result.error);
  }
}
