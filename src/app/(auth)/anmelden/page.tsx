import { auth } from "@/auth";
import { LoginForm } from "@/features/auth/forms/loginForm/LoginForm";
import { roleConfig } from "@/shared/auth/roleConfig";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{
    redirectStatus?: string;
  }>;
};

export default async function LoginPage(props: LoginPageProps) {
  const searchParams = await props.searchParams;
  const session = await auth();

  const is401 = searchParams.redirectStatus === "401";

  if (session?.user?.memberRoles) {
    const roles = session.user.memberRoles;
    for (const role of roles) {
      const redirectUrl = roleConfig[role].defaultRedirect;
      if (redirectUrl !== "/" && !is401) {
        return redirect(redirectUrl);
      }
    }
  }

  return <LoginForm />;
}
