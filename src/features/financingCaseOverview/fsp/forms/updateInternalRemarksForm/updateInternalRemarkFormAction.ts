"use server";

import {
  UpdateInternalRemarkFormOutputType,
  UpdateInternalRemarkFormState,
} from "@/features/financingCaseOverview/fsp/forms/updateInternalRemarksForm/updateInternalRemarkFormSchema";

// TODO(boilerplate): Implement the backend call to persist the internal remark.
// Use the secure-fetch pattern (see src/shared/backend/models/) to call the
// appropriate backend endpoint with the formData payload, then revalidate
// the relevant cache tags on success.
export async function updateInternalRemarkFormAction(
  state: UpdateInternalRemarkFormState,
  formData: UpdateInternalRemarkFormOutputType,
): Promise<UpdateInternalRemarkFormState> {
  console.log(formData);

  return { error: null, message: null };
}
