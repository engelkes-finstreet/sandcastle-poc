"use client";

import { SubmitFeedbackForm } from "@/features/feedback/admin/forms/submitFeedback/SubmitFeedbackForm";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { Button } from "@finstreet/ui/components/base/Button";
import { Panel } from "@finstreet/ui/components/base/Panel";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { useState } from "react";

export const FeedbackPageContent = () => {
  const t = useExtracted();
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <VStack gap={8} alignItems={"stretch"}>
      <Banner type={"info"}>
        <Typography as={"p"}>
          {t(
            "Dieses Formular ist nur für interne Rückmeldungen zur Anwendung gedacht. Ihr Feedback wird ausschließlich intern ausgewertet.",
          )}
        </Typography>
      </Banner>

      {isSubmitted ? (
        <Banner type={"success"}>
          <Typography as={"p"}>
            {t(
              "Vielen Dank! Ihr Feedback wurde erfasst und wird intern ausgewertet.",
            )}
          </Typography>
          <Button variant={"secondary"} onClick={() => setIsSubmitted(false)}>
            {t("Weiteres Feedback schreiben")}
          </Button>
        </Banner>
      ) : (
        <Panel p={8}>
          <SubmitFeedbackForm onSubmitted={() => setIsSubmitted(true)} />
        </Panel>
      )}
    </VStack>
  );
};
