import { routes } from "@/routes";
import { TypedFetchHandlerResult } from "@finstreet/secure-fetch";
import { notFound, redirect } from "next/navigation";

export async function handleFormRequestError(
  error: Extract<
    Awaited<TypedFetchHandlerResult<any>>,
    { success: false }
  >["error"],
  additionalData?: any,
) {
  switch (error.status) {
    case 401:
      return redirect(`${routes.auth.login()}?redirectStatus=401`);
    case 403:
      return redirect("/notAllowed");
    case 404:
      return notFound();
    default:
      return {
        error: error.message,
        message: null,
        ...additionalData,
      };
  }
}
