"use client";

import { useDeleteLegalRepresentativeModal } from "@/features/legalRepresentatives/modals/DeleteLegalRepresentativeModal/store";
import { useUpdateLegalRepresentativeModal } from "@/features/legalRepresentatives/modals/UpdateLegalRepresentativeModal/store";
import { Box, Grid, HStack, VStack } from "@styled-system/jsx";
import { Panel } from "@finstreet/ui/components/base/Panel";
import { Headline } from "@finstreet/ui/components/base/Headline";
import {
  Menu,
  MenuItem,
  MenuItems,
  MenuTrigger,
} from "@finstreet/ui/components/patterns/Menu";
import { FaEllipsisH } from "react-icons/fa";
import { FaArrowRight } from "react-icons/fa6";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useExtracted } from "next-intl";
import { Fragment } from "react";
import { LegalRepresentative } from "@/shared/backend/models/legalRepresentatives/schema";
import { dataTestIds } from "e2e/data/dataTestIds";

type Props = {
  financingCaseId: string;
  legalRepresentative: LegalRepresentative;
  isEditable: boolean;
};

export const LegalRepresentativePanel = ({
  financingCaseId,
  legalRepresentative,
  isEditable,
}: Props) => {
  const { setData } = useDeleteLegalRepresentativeModal();
  const { setData: setDataUpdate } = useUpdateLegalRepresentativeModal();
  const t = useExtracted();

  const handleDeleteItemClick = () => {
    setData({
      financingCaseId,
      legalRepresentativeId: legalRepresentative.id,
      name: `${legalRepresentative.firstName} ${legalRepresentative.lastName}`,
    });
  };

  const handleUpdateItemClick = () => {
    setDataUpdate({
      financingCaseId,
      legalRepresentativeDefaultValues: {
        financingCaseId,
        legalRepresentativeId: legalRepresentative.id,
        ...legalRepresentative,
      },
    });
  };

  return (
    <Box data-testid={dataTestIds.legalRepresentatives.legalRepresentativeCard}>
      <Panel css={{ backgroundColor: "neutral.lightest", border: "none" }}>
        <Grid
          gridTemplateColumns={"1fr min-content"}
          gap={4}
          css={{ paddingBottom: 8 }}
        >
          <Headline
            as={"h3"}
            data-testid={"legal-representative-name"}
            css={{ maxWidth: "100%", overflow: "hidden" }}
          >
            <VStack gap={0} alignItems={"flex-start"}>
              <Typography as={"p"} fontWeight={"bold"}>
                {`${legalRepresentative.firstName} ${legalRepresentative.lastName}`}
              </Typography>
              {legalRepresentative.soleSignatureAuthorized ? (
                <Typography as={"p"}>
                  ({t("alleinvertretungsberechtigt")})
                </Typography>
              ) : null}
            </VStack>
          </Headline>
          {isEditable ? (
            <HStack alignItems={"start"} justifyContent={"center"}>
              <Menu>
                <MenuTrigger data-testid={dataTestIds.menu.trigger}>
                  <Box p={2}>
                    <FaEllipsisH />
                  </Box>
                </MenuTrigger>
                <MenuItems>
                  <MenuItem
                    onClick={handleUpdateItemClick}
                    data-testid={dataTestIds.menu.update}
                  >
                    <FaArrowRight />
                    <Typography as={"p"}>{t("Bearbeiten")}</Typography>
                  </MenuItem>
                  <MenuItem
                    onClick={handleDeleteItemClick}
                    data-testid={dataTestIds.menu.delete}
                  >
                    <FaArrowRight />
                    <Typography as={"p"}>{t("Löschen")}</Typography>
                  </MenuItem>
                </MenuItems>
              </Menu>
            </HStack>
          ) : null}
        </Grid>
        <Grid gridTemplateColumns={"1fr min-content"} gap={0}>
          <Fragment>
            <Typography as={"p"} color={"text.black"}>
              {t("Mobil")}:
            </Typography>
            <Typography as={"p"} color={"text.dark"}>
              {legalRepresentative.phoneNumber}
            </Typography>
          </Fragment>
          <Fragment>
            <Typography as={"p"} color={"text.black"}>
              {t("E-Mail")}:
            </Typography>
            <Typography as={"p"} color={"text.dark"}>
              {legalRepresentative.email}
            </Typography>
          </Fragment>
        </Grid>
      </Panel>
    </Box>
  );
};
