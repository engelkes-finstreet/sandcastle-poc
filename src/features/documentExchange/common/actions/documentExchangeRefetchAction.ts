"use server";

import { revalidatePath } from "next/cache";
import { routes } from "@/routes";

export default async function documentExchangeRefetchAction(
  financingCaseId: string,
) {
  revalidatePath(routes.customer.financingCase.documents(financingCaseId));
  revalidatePath(routes.fsp.financingCase.documents(financingCaseId));
}
