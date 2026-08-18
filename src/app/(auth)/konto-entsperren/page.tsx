import { VStack } from "@styled-system/jsx";
import { Panel } from "@finstreet/ui/components/base/Panel";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Spinner } from "@finstreet/ui/components/base/Spinner";
import { Suspense } from "react";
import UnlockAccount from "@/features/auth/components/UnlockAccount";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";
import { getExtracted } from "next-intl/server";

export const metadata: Metadata = {
  title: `Konto entsperren | ${Constants.companyName}`,
};

type UnlockAccountPageProps = {
  searchParams: Promise<{
    unlockToken: string | undefined;
  }>;
};

export default async function UnlockAccountPage(props: UnlockAccountPageProps) {
  const { unlockToken } = await props.searchParams;
  const t = await getExtracted();

  return (
    <Panel p={8}>
      <VStack gap={4} alignItems={"stretch"}>
        <Headline as={"h1"}>{t("Konto freischalten")}</Headline>
        {!unlockToken ? (
          <Banner type="error">
            {t(
              "Kein Token zum Freischalten des Kontos gefunden. Bitte versuchen Sie erneut den Link in Ihrer E-Mail zu öffnen oder kontaktieren Sie Ihren Ansprechpartner.",
            )}
          </Banner>
        ) : (
          <>
            <Typography as={"p"}>
              {t(
                "Ihr Konto wird gerade freigeschaltet. Bitte warten Sie einen Moment.",
              )}
            </Typography>
            <Suspense fallback={<Spinner size={"xlarge"} />}>
              <UnlockAccount unlockToken={unlockToken} />
            </Suspense>
          </>
        )}
      </VStack>
    </Panel>
  );
}
