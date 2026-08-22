import { SendFeedbackSection } from "@/features/feedback/components/SendFeedbackSection";
import { Constants } from "@/shared/utils/constants";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Panel } from "@finstreet/ui/components/base/Panel";
import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import {
  PageHeader,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { VStack } from "@styled-system/jsx";
import { Metadata } from "next";
import { getExtracted } from "next-intl/server";

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
            {t(
              "Ihr Feedback geht direkt an das Produktteam. Bitte geben Sie keine personenbezogenen Kundendaten an.",
            )}
          </Banner>
          <Panel p={8}>
            <SendFeedbackSection />
          </Panel>
        </VStack>
      </PageContent>
    </>
  );
}
