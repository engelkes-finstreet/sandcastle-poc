import { VStack } from "@styled-system/jsx";
import { SetNewPasswordForm } from "@/features/auth/forms/setNewPasswordForm/NewPasswordForm";
import { useExtracted } from "next-intl";
import { Panel } from "@finstreet/ui/components/base/Panel";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";

export const metadata: Metadata = {
  title: `Neues Passwort setzen | ${Constants.companyName}`,
};

export default function SetNewPasswordPage() {
  const t = useExtracted();

  return (
    <Panel p={8}>
      <VStack gap={4} alignItems={"stretch"}>
        <Headline as={"h1"}>{t("Passwort vergeben")}</Headline>
        <Typography as={"p"}>
          {t("Bitte vergeben Sie ein neues Passwort")}
        </Typography>
        <SetNewPasswordForm />
      </VStack>
    </Panel>
  );
}
