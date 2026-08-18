import { HeaderUserNavLink } from "@finstreet/ui/components/pageLayout/Header";
import { routes } from "@/routes";
import { signOut } from "@/auth";
import { dataTestIds } from "e2e/data/dataTestIds";

type LogoutHeaderUserNavLinkProps = {
  label: string;
};

export const LogoutHeaderUserNavLink = ({
  label,
}: LogoutHeaderUserNavLinkProps) => {
  const handleSignOut = async () => {
    "use server";
    await signOut({
      redirectTo: routes.auth.login(),
    });
  };

  return (
    <HeaderUserNavLink
      onClick={handleSignOut}
      name={label}
      data-testid={dataTestIds.header.userMenu.logoutButton}
    />
  );
};
