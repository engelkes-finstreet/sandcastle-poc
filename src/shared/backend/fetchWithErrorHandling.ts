import { routes } from "@/routes";
import {
  EndpointConfig,
  TypedFetchHandlerResult,
} from "@finstreet/secure-fetch";
import { notFound, redirect } from "next/navigation";

export async function fetchWithErrorHandling<T extends EndpointConfig>(
  fetcher: () => TypedFetchHandlerResult<T>,
) {
  const result = await fetcher();

  if (result.success) {
    return result.data;
  } else {
    const { status } = result.error;

    switch (status) {
      case 401:
        return redirect(`${routes.auth.login()}?redirectStatus=401`);
      case 403:
        return redirect(routes.notAllowed);
      case 404:
        return notFound();
      default:
        throw new Error(result.error.message ?? "An unknown error occurred");
    }
  }
}
