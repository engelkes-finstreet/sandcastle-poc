import { Header } from "@finstreet/ui/components/pageLayout/Header";
import { getExtracted } from "next-intl/server";
import { ResponsiveHeaderNav } from "@/shared/components/ResponsiveHeaderNav";
import { LogoutHeaderUserNavLink } from "@/shared/components/LogoutHeaderUserNavLink";
import { routes } from "@/routes";

export const AdminLayoutHeader = async () => {
  const t = await getExtracted();

  return (
    <Header>
      <ResponsiveHeaderNav
        logoLink={routes.admin.members.index}
        headerNavLinks={[]}
        userNavLinks={[
          <LogoutHeaderUserNavLink label={t("Abmelden")} key={"logout"} />,
        ]}
      />
    </Header>
  );
};
