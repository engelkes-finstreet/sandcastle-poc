import {
  Header,
  HeaderUserNavLink,
} from "@finstreet/ui/components/pageLayout/Header";
import { ResponsiveHeaderNav } from "@/shared/components/ResponsiveHeaderNav";
import { routes } from "@/routes";
import { auth } from "@/auth";
import { dataTestIds } from "e2e/data/dataTestIds";
import { LogoutHeaderUserNavLink } from "@/shared/components/LogoutHeaderUserNavLink";

export const CustomerLayoutHeader = async () => {
  const session = await auth();
  return (
    <Header>
      <ResponsiveHeaderNav
        logoLink={"#"}
        headerNavLinks={[]}
        userNavLinks={
          session
            ? [<LogoutHeaderUserNavLink label={"Logout"} key={"logout"} />]
            : [
                <HeaderUserNavLink
                  href={routes.auth.login()}
                  name={"Login"}
                  data-testid={dataTestIds.header.userMenu.loginButton}
                  key={routes.auth.login()}
                />,
              ]
        }
      />
    </Header>
  );
};
