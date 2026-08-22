"use client";

import { SendFeedbackForm } from "@/features/feedback/forms/sendFeedback/SendFeedbackForm";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { Button } from "@finstreet/ui/components/base/Button";
import { HStack, VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { useState } from "react";

export const SendFeedbackSection = () => {
  const t = useExtracted();
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (isSubmitted) {
    return (
      <VStack gap={8} alignItems={"stretch"}>
        <Banner type={"success"}>
          {t("Vielen Dank! Ihr Feedback wurde an das Produktteam übermittelt.")}
        </Banner>
        <HStack>
          <Button variant={"secondary"} onClick={() => setIsSubmitted(false)}>
            {t("Weiteres Feedback schreiben")}
          </Button>
        </HStack>
      </VStack>
    );
  }

  return <SendFeedbackForm onSuccess={() => setIsSubmitted(true)} />;
};
