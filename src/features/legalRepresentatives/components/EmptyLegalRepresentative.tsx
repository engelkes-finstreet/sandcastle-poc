"use client";

import { transition } from "@styled-system/recipes";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useCreateLegalRepresentativeModal } from "@/features/legalRepresentatives/modals/CreateLegalRepresentativeModal/store";
import { styled } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { dataTestIds } from "e2e/data/dataTestIds";

export const EmptyLegalRepresentative = ({
  financingCaseId,
}: {
  financingCaseId: string;
}) => {
  const t = useExtracted();
  const { setData } = useCreateLegalRepresentativeModal();

  return (
    <styled.button
      display={"flex"}
      justifyContent={"center"}
      alignItems={"center"}
      border={"light"}
      borderRadius={"default"}
      py={12}
      minH={"160"}
      cursor={"pointer"}
      background={{ _hover: "neutral.lighter" }}
      className={transition()}
      data-testid={
        dataTestIds.legalRepresentatives.newLegalRepresentativeButton
      }
      onClick={() => {
        setData({ financingCaseId: financingCaseId });
      }}
    >
      <Typography
        color={"text.dark"}
        fontWeight={"bold"}
        css={{ whiteSpace: "normal" }}
        textAlign={"center"}
      >
        {t("Neue Vertretungsberechtigte Person anlegen")}
      </Typography>
    </styled.button>
  );
};
