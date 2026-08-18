"use server";

import {
  createLegalRepresentative,
  updateLegalRepresentative,
} from "@/shared/backend/models/legalRepresentatives/server";
import {
  CreateLegalRepresentativeFormState,
  CreateLegalRepresentativeOutputType,
  UpdateLegalRepresentativeFormState,
  UpdateLegalRepresentativeOutputType,
} from "./legalRepresentativeSchema";
import { revalidatePath } from "next/cache";
import { routes } from "@/routes";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";
import { Portal } from "@/shared/types/Portal";

export async function createLegalRepresentativeAction(
  state: CreateLegalRepresentativeFormState,
  formData: CreateLegalRepresentativeOutputType,
  portal: Portal,
): Promise<CreateLegalRepresentativeFormState> {
  const result = await createLegalRepresentative()({
    pathVariables: {
      financingCaseId: formData.financingCaseId,
    },
    payload: {
      soleSignatureAuthorized: formData.soleSignatureAuthorized,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
    },
  });

  if (result.success) {
    revalidatePath(
      portal === "customer"
        ? routes.customer.financingCase.legalRepresentatives(
            formData.financingCaseId,
          )
        : routes.fsp.financingCase.legalRepresentatives(
            formData.financingCaseId,
          ),
    );
    return {
      error: null,
      message: "Legal representative created successfully",
    };
  } else {
    return handleFormRequestError(result.error);
  }
}

export async function updateLegalRepresentativeAction(
  state: UpdateLegalRepresentativeFormState,
  formData: UpdateLegalRepresentativeOutputType,
  portal: Portal,
): Promise<UpdateLegalRepresentativeFormState> {
  const result = await updateLegalRepresentative()({
    pathVariables: {
      financingCaseId: formData.financingCaseId,
      legalRepresentativeId: formData.legalRepresentativeId,
    },
    payload: {
      soleSignatureAuthorized: formData.soleSignatureAuthorized,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
    },
  });

  if (result.success) {
    revalidatePath(
      portal === "customer"
        ? routes.customer.financingCase.legalRepresentatives(
            formData.financingCaseId,
          )
        : routes.fsp.financingCase.legalRepresentatives(
            formData.financingCaseId,
          ),
    );
    return {
      error: null,
      message: "Legal representative updated successfully",
    };
  } else {
    return handleFormRequestError(result.error);
  }
}
