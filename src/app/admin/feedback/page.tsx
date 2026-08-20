import { Metadata } from "next";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import {
  PageHeader,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { getExtracted } from "next-intl/server";

import { VStack } from "@styled-system/jsx";

import { FeedbackContent } from "@/features/feedback/fsp/components/FeedbackContent";
import { Constants } from "@/shared/utils/constants";

export const metadata: Metadata = {
  title: `Feedback | ${Constants.companyName}`,
};

export default async function AdminFeedbackPage() {
  const t = await getExtracted();

  return (
    <>
      <PageHeader>
        <PageHeaderTitle>
          <Headline as={"h1"}>{t("Feedback")}</Headline>
        </PageHeaderTitle>
      </PageHeader>
      <PageContent>
        <VStack gap={8} alignItems={"stretch"}>
          <Banner type={"info"}>
            <Typography as={"p"}>
              {t(
                "Ihr Feedback wird intern ausgewertet und hilft uns, die Anwendung zu verbessern. Bitte geben Sie hier keine personenbezogenen Daten von Kunden ein.",
              )}
            </Typography>
          </Banner>
          <FeedbackContent />
        </VStack>
      </PageContent>
    </>
  );
}
