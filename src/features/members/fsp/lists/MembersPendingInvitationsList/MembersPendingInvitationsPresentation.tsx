"use client";

import { ListItems } from "@/shared/types/InteractiveListTypes";
import {
  InteractiveList,
  InteractiveListColumn,
  InteractiveListGrid,
} from "@finstreet/ui/components/patterns/InteractiveList";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { Box, Grid, GridItem, HStack, VStack } from "@styled-system/jsx";
import { OverflownTextTooltip } from "@finstreet/ui/components/patterns/OverflownTextTooltip";
import { IconButton } from "@finstreet/ui/components/base/IconButton";
import { FaRegTrashAlt } from "react-icons/fa";
import { FaRegPaperPlane } from "react-icons/fa6";
import { useResendInvitationModal } from "@/features/members/common/modals/ResendInvitationModal/store";
import { ResendInvitationModal } from "@/features/members/common/modals/ResendInvitationModal";
import { useWithdrawMemberInvitationModal } from "@/features/members/common/modals/WithdrawInvitationModal/store";
import { WithdrawInvitationModal } from "@/features/members/common/modals/WithdrawInvitationModal";
import { useExtracted } from "next-intl";
import { InvitationType } from "@/shared/backend/models/fspMembers/schema";
import { DateFormat } from "@finstreet/ui/components/base/DateFormat";
import { usePagination } from "@/shared/hooks/usePagination";
import { membersListSearchParams } from "@/features/members/fsp/lists/MembersList/MembersListSearchParams";
import { Constants } from "@/shared/utils/constants";
import { dataTestIds } from "e2e/data/dataTestIds";

type MembersPendingInvitationsListPresentationType = {
  pendingInvitations: ListItems<InvitationType[]>;
};

const gridTemplateAreas =
  '"name name email email email email department department invitedAt invitedAt actions actions"';

export const MembersPendingInvitationsListPresentation = ({
  pendingInvitations,
}: MembersPendingInvitationsListPresentationType) => {
  const t = useExtracted();
  const { setData } = useResendInvitationModal();
  const { setData: setDataWithdrawInvitation } =
    useWithdrawMemberInvitationModal();

  const handleResendInvitation = (item: InvitationType) => {
    setData({
      invitationId: item.id,
      memberEmail: item.email,
      memberName: `${item.firstName} ${item.lastName}`,
    });
  };

  const handleWithdrawInvitation = (item: InvitationType) => {
    setDataWithdrawInvitation({
      invitationId: item.id,
      memberEmail: item.email,
      memberName: `${item.firstName} ${item.lastName}`,
    });
  };

  const renderGroupHeader = () => (
    <InteractiveListGrid gridTemplateAreas={gridTemplateAreas}>
      <InteractiveListColumn gridArea={"name"}>
        <Typography as="p" color="text.dark">
          {t("Name")}
        </Typography>
      </InteractiveListColumn>
      <InteractiveListColumn gridArea={"email"}>
        <Typography as="p" color="text.dark">
          {t("E-Mail-Adresse")}
        </Typography>
      </InteractiveListColumn>
      <InteractiveListColumn gridArea={"department"}>
        <Typography as="p" color="text.dark">
          {t("Abteilung")}
        </Typography>
      </InteractiveListColumn>
      <InteractiveListColumn gridArea={"invitedAt"}>
        <Typography as="p" color="text.dark">
          {t("Eingeladen am")}
        </Typography>
      </InteractiveListColumn>
    </InteractiveListGrid>
  );

  const renderItem = (item: InvitationType) => (
    <>
      <Grid columns={2} rowGap={8} columnGap={4} hideFrom={"lg"}>
        <GridItem>
          <VStack width={"100%"} alignItems={"flex-start"} gap={1}>
            <Typography color={"text.dark"}>{t("Name")}</Typography>

            <VStack width={"100%"} alignItems={"flex-start"}>
              <OverflownTextTooltip
                text={`${item.firstName} ${item.lastName}`}
                css={{ fontWeight: "bold", color: "text.black" }}
              />
            </VStack>
          </VStack>
        </GridItem>
        <GridItem>
          <HStack gap={1} justifyContent={"flex-end"}>
            <IconButton
              variant="onlyIcon"
              Icon={FaRegPaperPlane}
              onClick={() => handleResendInvitation(item)}
              data-testid={`${dataTestIds.members.resendInvitation.resendInvitationButton(
                item.email,
              )}-mobile`}
            />
            <IconButton
              variant="onlyIcon"
              Icon={FaRegTrashAlt}
              onClick={() => handleWithdrawInvitation(item)}
              data-testid={`${dataTestIds.members.withdrawInvitation.withdrawInvitationButton(
                item.email,
              )}-mobile`}
            />
          </HStack>
        </GridItem>
        <GridItem colSpan={2}>
          <VStack width={"100%"} alignItems={"flex-start"} gap={1}>
            <Typography color={"text.dark"}>{t("E-Mail-Adresse")}</Typography>

            <OverflownTextTooltip
              text={item.email}
              css={{ color: "text.dark" }}
            />
          </VStack>
        </GridItem>
        <GridItem colSpan={2}>
          <VStack width={"100%"} alignItems={"flex-start"} gap={1}>
            <Typography color={"text.dark"}>{t("Abteilung")}</Typography>

            <Typography color="text.dark">{item.department.label}</Typography>
          </VStack>
        </GridItem>
      </Grid>

      <Box py={4} hideBelow={"lg"}>
        <InteractiveListGrid
          gridTemplateAreas={gridTemplateAreas}
          data-testid={dataTestIds.members.pendingInvitations.pendingInvitationsList.memberItem(
            item.email,
          )}
        >
          <InteractiveListColumn gridArea={"name"}>
            <VStack width={"100%"} alignItems={"flex-start"}>
              <OverflownTextTooltip
                text={`${item.firstName} ${item.lastName}`}
                css={{ fontWeight: "bold", color: "text.black" }}
              />
            </VStack>
          </InteractiveListColumn>
          <InteractiveListColumn
            gridArea={"email"}
            data-testid={dataTestIds.members.pendingInvitations.pendingInvitationsList.memberEmailCell(
              item.email,
            )}
          >
            <OverflownTextTooltip
              text={item.email}
              css={{ color: "text.dark" }}
            />
          </InteractiveListColumn>
          <InteractiveListColumn gridArea={"department"}>
            <Typography color="text.dark">{item.department.label}</Typography>
          </InteractiveListColumn>
          <InteractiveListColumn gridArea={"invitedAt"}>
            <Typography color="text.dark">
              <DateFormat value={item.firstSentAt} type="date" />
            </Typography>
          </InteractiveListColumn>
          <InteractiveListColumn alignItems={"flex-end"} gridArea={"actions"}>
            <HStack gap={1}>
              <IconButton
                variant="onlyIcon"
                Icon={FaRegPaperPlane}
                onClick={() => handleResendInvitation(item)}
                data-testid={dataTestIds.members.resendInvitation.resendInvitationButton(
                  item.email,
                )}
              />
              <IconButton
                variant="onlyIcon"
                Icon={FaRegTrashAlt}
                onClick={() => handleWithdrawInvitation(item)}
                data-testid={dataTestIds.members.withdrawInvitation.withdrawInvitationButton(
                  item.email,
                )}
              />
            </HStack>
          </InteractiveListColumn>
        </InteractiveListGrid>
      </Box>
    </>
  );

  const renderNoItems = () => (
    <Box py={12}>
      <Typography as="p" color="text.dark">
        {t("Keine eingeladene Benutzer vorhanden")}
      </Typography>
    </Box>
  );

  const paginatedPendingInvitations = usePagination({
    parserBuilder: membersListSearchParams.pagination,
    listItems: pendingInvitations,
  });

  return (
    <>
      <InteractiveList<InvitationType>
        data={paginatedPendingInvitations}
        data-testid={
          dataTestIds.members.pendingInvitations.pendingInvitationsList.root
        }
        itemKey={"id"}
        variant={"separated"}
        currentPageLabel={"{currentMin} - {currentMax} von {totalCount}"}
        alwaysShowGroupHeader={true}
        renderGroupHeader={renderGroupHeader}
        renderItem={renderItem}
        renderNoItems={renderNoItems}
        pageSize={parseInt(Constants.defaultPageSize)}
      />
      <ResendInvitationModal />
      <WithdrawInvitationModal />
    </>
  );
};
