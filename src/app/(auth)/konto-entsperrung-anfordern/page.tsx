import { VStack } from "@styled-system/jsx";
import { Panel } from "@finstreet/ui/components/base/Panel";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { getExtracted } from "next-intl/server";
import { RequestAccountUnlockForm } from "@/features/auth/forms/requestAccountUnlockForm/RequestAccountUnlockForm";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";

export const metadata: Metadata = {
  title: `Konto entsperren | ${Constants.companyName}`,
};

export default async function RequestAccountUnlockPage() {
  const t = await getExtracted();

  return (
    <Panel p={8}>
      <VStack gap={4} alignItems={"stretch"}>
        <Headline as={"h1"}>{t("Gesperrtes Konto freischalten")}</Headline>
        <Typography as={"p"}>
          {t(
            "Bitte geben Sie Ihre E-Mail-Adresse ein, um Ihr Konto freizuschalten.",
          )}
        </Typography>
        <RequestAccountUnlockForm />
      </VStack>
    </Panel>
  );
}
