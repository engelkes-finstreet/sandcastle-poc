"use server";

import { signIn } from "@/auth";
import { routes } from "@/routes";
import { AuthenticationError } from "@/shared/utils/AuthenticationError";
import { redirect } from "next/navigation";
import {
  LoginFormState,
  LoginType,
} from "@/features/auth/forms/loginForm/loginFormSchema";

export async function loginFormAction(
  state: LoginFormState,
  { email, password }: LoginType,
): Promise<LoginFormState> {
  try {
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (result?.error) {
      return {
        error: result.error,
        message: null,
      };
    }
  } catch (error) {
    console.error("loginFormAction Error:", JSON.stringify(error, null, 2));
    if (error instanceof AuthenticationError) {
      return {
        error: error.statusResponse.error.message ?? "",
        message: null,
      };
    }

    return {
      error: "Invalid credentials",
      message: "An internal error occured. Please try again later.",
    };
  }

  redirect(routes.auth.login());
}
