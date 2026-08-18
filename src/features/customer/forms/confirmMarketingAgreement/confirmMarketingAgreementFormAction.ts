"use server";

import { routes } from "@/routes";
import { confirmMarketingAgreement } from "@/shared/backend/models/agreeables/server";
import {
  ConfirmMarketingAgreementFormState,
  ConfirmMarketingAgreementType,
} from "./confirmMarketingAgreementFormConfig";
import { redirect } from "next/navigation";
import { getExtracted } from "next-intl/server";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";

export async function confirmMarketingAgreementFormAction(
  state: ConfirmMarketingAgreementFormState,
  formData: ConfirmMarketingAgreementType,
): Promise<ConfirmMarketingAgreementFormState> {
  const result = await confirmMarketingAgreement({ payload: formData });
  const t = await getExtracted();

  if (result.success) {
    redirect(routes.loginConfirmMarketingAgreement);
  } else {
    // Handle 401 separately because it's not about user authorization but about the token being invalid
    if (result.error.status === 401) {
      return {
        error:
          result.error.message ??
          t(
            "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später noch einmal.",
          ),
        message: null,
      };
    }
    return handleFormRequestError(result.error);
  }
}
