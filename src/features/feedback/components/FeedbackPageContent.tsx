"use client";

import { Banner } from "@finstreet/ui/components/base/Banner";
import { Button } from "@finstreet/ui/components/base/Button";
import { Panel } from "@finstreet/ui/components/base/Panel";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { SubmitFeedbackForm } from "@/features/feedback/forms/submitFeedback/SubmitFeedbackForm";
import { useConfirmFeedbackSubmissionModal } from "@/features/feedback/modals/confirmFeedbackSubmission/store";

export const FeedbackPageContent = () => {
  const t = useExtracted();
  const { isSubmitted, reset } = useConfirmFeedbackSubmissionModal();

  if (isSubmitted) {
    return (
      <Banner type={"success"}>
        <Typography as={"p"}>
          {t(
            "Vielen Dank! Ihr Feedback wurde an das interne Team übermittelt.",
          )}
        </Typography>
        <Button variant={"secondary"} onClick={() => reset()}>
          {t("Weiteres Feedback geben")}
        </Button>
      </Banner>
    );
  }

  return (
    <VStack gap={8} alignItems={"stretch"}>
      <Banner type={"info"}>
        <Typography as={"p"}>
          {t(
            "Dieses Formular ist ausschließlich für internes Feedback zur Anwendung gedacht. Bitte übermitteln Sie hier keine Kundendaten.",
          )}
        </Typography>
      </Banner>
      <Panel p={8}>
        <SubmitFeedbackForm />
      </Panel>
    </VStack>
  );
};
