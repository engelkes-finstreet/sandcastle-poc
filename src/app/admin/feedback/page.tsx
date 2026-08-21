import { Metadata } from "next";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import {
  PageHeader,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { getExtracted } from "next-intl/server";
import { Constants } from "@/shared/utils/constants";
import { FeedbackPageContent } from "@/features/feedback/components/FeedbackPageContent";
import { ConfirmFeedbackSubmissionModal } from "@/features/feedback/modals/confirmFeedbackSubmission/ConfirmFeedbackSubmissionModal";

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
        <FeedbackPageContent />
      </PageContent>
      <ConfirmFeedbackSubmissionModal />
    </>
  );
}
