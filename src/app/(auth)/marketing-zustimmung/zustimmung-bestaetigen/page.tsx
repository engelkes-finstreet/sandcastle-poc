import { VStack } from "@styled-system/jsx";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Panel } from "@finstreet/ui/components/base/Panel";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";
import { ConfirmMarketingAgreementForm } from "@/features/customer/forms/confirmMarketingAgreement";
import { getExtracted } from "next-intl/server";

export const metadata: Metadata = {
  title: `Werbeeinwilligung bestätigen | ${Constants.companyName}`,
};

type Props = {
  searchParams: Promise<{
    token: string;
  }>;
};

export default async function CustomerMarketingAgreementConfirmAcceptancePage({
  searchParams,
}: Props) {
  const token = (await searchParams).token;
  const t = await getExtracted();
  return (
    <Panel p={8}>
      <VStack gap={8} alignItems={"stretch"}>
        <Headline as={"h1"}>{t("Vielen Dank für Ihre Anfrage")}</Headline>
        <Typography as="p">
          {t(
            "Bitte bestätigen Sie Ihre Werbeeinwilligung mit einem Klick auf den folgenden Button:",
          )}
        </Typography>
        <ConfirmMarketingAgreementForm token={token} />
      </VStack>
    </Panel>
  );
}
