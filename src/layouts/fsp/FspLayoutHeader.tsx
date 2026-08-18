import {
  Header,
  HeaderUserNavLink,
} from "@finstreet/ui/components/pageLayout/Header";
import { routes } from "@/routes";
import { getExtracted } from "next-intl/server";
import { dataTestIds } from "e2e/data/dataTestIds";
import { ResponsiveHeaderNav } from "@/shared/components/ResponsiveHeaderNav";
import { LogoutHeaderUserNavLink } from "@/shared/components/LogoutHeaderUserNavLink";
import { auth } from "@/auth";

export const FspLayoutHeader = async () => {
  const t = await getExtracted();
  const session = await auth();

  return (
    <Header>
      <ResponsiveHeaderNav
        logoLink={routes.fsp.financingCase.list()}
        headerNavLinks={[]}
        userNavLinks={
          session
            ? [<LogoutHeaderUserNavLink label={t("Abmelden")} key={"logout"} />]
            : [
                <HeaderUserNavLink
                  href={routes.auth.login()}
                  name={t("Anmelden")}
                  data-testid={dataTestIds.header.userMenu.loginButton}
                  key={routes.auth.login()}
                />,
              ]
        }
      />
    </Header>
  );
};
