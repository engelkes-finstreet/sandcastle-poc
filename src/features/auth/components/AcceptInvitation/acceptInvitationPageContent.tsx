"use client";

import { TokenExpiredBanner } from "@/features/auth/components/AcceptInvitation/TokenExpiredBanner";
import { AcceptInvitationForm } from "@/features/auth/forms/acceptInvitationForm/AcceptInvitationForm";
import { InvitationPreviewType } from "@/shared/backend/models/auth/server";
import { HStack, VStack } from "@styled-system/jsx";
import { Button } from "@finstreet/ui/components/base/Button";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Panel } from "@finstreet/ui/components/base/Panel";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useExtracted } from "next-intl";
import { useState } from "react";
import { FaArrowRight } from "react-icons/fa6";
import { dataTestIds } from "e2e/data/dataTestIds";

export default function AcceptInvitationPageContent({
  invitationPreview,
  invitationToken,
}: {
  invitationPreview: InvitationPreviewType;
  invitationToken: string;
}) {
  const [showInformationPanel, setShowInformationPanel] = useState(true);
  const t = useExtracted();

  if (showInformationPanel) {
    return (
      <Panel p={8}>
        <VStack gap={4} alignItems={"stretch"}>
          <Headline as={"h1"}>{t("Jetzt registrieren")}</Headline>
          <Typography>
            {t(
              "Um Ihre Einladung anzunehmen, vergeben Sie bitte ein Passwort.",
            )}
          </Typography>
          <HStack mt={16} justifyContent={"flex-end"}>
            <Button
              icon={<FaArrowRight />}
              data-testid={
                dataTestIds.acceptInvitation.information.submitButton
              }
              onClick={() => setShowInformationPanel(false)}
            >
              {t("Passwort vergeben")}
            </Button>
          </HStack>
        </VStack>
      </Panel>
    );
  }

  if (invitationPreview.status === "pending") {
    return (
      <Panel>
        <VStack gap={4} alignItems={"stretch"}>
          <Headline as={"h1"}>{t("Jetzt registrieren")}</Headline>
          <Typography>
            {t(
              "Bitte vergeben Sie sich ein Passwort, um Ihren Factoring-Antrag zu vervollständigen.",
            )}
          </Typography>
          <AcceptInvitationForm
            token={invitationToken}
            firstName={invitationPreview.firstName}
            lastName={invitationPreview.lastName}
          />
        </VStack>
      </Panel>
    );
  }

  return <TokenExpiredBanner />;
}
