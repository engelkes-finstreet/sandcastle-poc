import { Typography } from "@finstreet/ui/components/base/Typography";
import { Header } from "@finstreet/ui/components/pageLayout/Header";

export const AuthLayoutHeader = async () => {
  return (
    <Header>
      <Typography as={"p"} color="text.dark" fontSize={"xl"}>
        {/* <a href={routes.login} title={t("logoLinkTitle")}>
          <Logo
            width={200}
            height={85}
            fspName="SozialFactoring"
            src={LogoSvg}
          />
        </a> */}
        Replace with logo
      </Typography>
    </Header>
  );
};
