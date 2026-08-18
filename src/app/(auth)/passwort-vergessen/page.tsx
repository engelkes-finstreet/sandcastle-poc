import { VStack } from "@styled-system/jsx";
import { Panel } from "@finstreet/ui/components/base/Panel";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { RequestPasswordResetForm } from "@/features/auth/forms/requestPasswordResetForm/RequestPasswordResetForm";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { getExtracted } from "next-intl/server";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";

export const metadata: Metadata = {
  title: `Passwort vergessen | ${Constants.companyName}`,
};

type RequestPasswordResetPageProps = {
  searchParams: Promise<{
    requestSuccess: string;
  }>;
};

export default async function RequestPasswordResetPage(
  props: RequestPasswordResetPageProps,
) {
  const t = await getExtracted();
  const searchParams = await props.searchParams;

  return (
    <Panel p={8}>
      <VStack gap={4} alignItems={"stretch"}>
        <Headline as={"h1"}>{t("Passwort vergessen")}</Headline>
        {searchParams.requestSuccess ? (
          <Banner type="success">
            {t(
              "Falls diese E-Mail-Adresse existiert, erhalten Sie eine Nachricht mit weiteren Instruktionen.",
            )}
          </Banner>
        ) : null}
        <Typography as={"p"}>
          {t("Bitte geben Sie Ihre E-Mail-Adresse ein")}
        </Typography>
        <RequestPasswordResetForm />
      </VStack>
    </Panel>
  );
}
