"use client";

import { Banner } from "@finstreet/ui/components/base/Banner";
import { Button } from "@finstreet/ui/components/base/Button";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useExtracted } from "next-intl";
import { useState } from "react";

import { SubmitFeedbackForm } from "@/features/feedback/fsp/forms/submitFeedback/SubmitFeedbackForm";

export const FeedbackContent = () => {
  const t = useExtracted();
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isSubmitted) {
    return (
      <Banner type={"success"}>
        <Typography as={"p"}>
          {t(
            "Vielen Dank! Ihr Feedback wurde übermittelt und wird intern ausgewertet.",
          )}
        </Typography>
        <Button onClick={() => setIsSubmitted(false)}>
          {t("Weiteres Feedback schreiben")}
        </Button>
      </Banner>
    );
  }

  return <SubmitFeedbackForm onSuccess={() => setIsSubmitted(true)} />;
};
