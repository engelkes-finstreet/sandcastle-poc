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
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { FaPeopleArrows } from "react-icons/fa6";
import Link from "next/link";
import { routes } from "@/routes";
import { useRevokeMemberModal } from "@/features/members/fsp/modals/RevokeMemberModal/store";
import { RevokeMemberModal } from "@/features/members/fsp/modals/RevokeMemberModal";
import { useExtracted } from "next-intl";
import { FspMemberType } from "@/shared/backend/models/fspMembers/schema";
import { usePagination } from "@/shared/hooks/usePagination";
import { membersListSearchParams } from "@/features/members/fsp/lists/MembersList/MembersListSearchParams";
import { Constants } from "@/shared/utils/constants";
import { dataTestIds } from "e2e/data/dataTestIds";
import { useUpdateMemberModal } from "@/features/members/fsp/modals/UpdateMemberModal/store";

type MembersListPresentationType = {
  members: ListItems<FspMemberType[]>;
};

const gridTemplateAreas =
  '"name name name email email email department department department substitute substitute actions actions"';

export const MembersListPresentation = ({
  members,
}: MembersListPresentationType) => {
  const { setData } = useRevokeMemberModal();
  const { setData: setUpdateMemberData } = useUpdateMemberModal();
  const t = useExtracted();

  const handleRevokeMember = (item: FspMemberType) => {
    setData({
      membershipId: item.id,
      membershipName: `${item.firstName} ${item.lastName}`,
    });
  };

  const handleUpdateMember = (item: FspMemberType) => {
    setUpdateMemberData(item);
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
      <InteractiveListColumn gridArea={"substitute"}>
        <Typography as="p" color="text.dark">
          {t("Vertreten durch")}
        </Typography>
      </InteractiveListColumn>
    </InteractiveListGrid>
  );

  const renderItem = (item: FspMemberType) => (
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
            <Link href={routes.admin.members.substitutes(item.id)}>
              <IconButton variant="onlyIcon" Icon={FaPeopleArrows} />
            </Link>
            <IconButton
              variant="onlyIcon"
              Icon={FaRegEdit}
              onClick={() => handleUpdateMember(item)}
            />
            <IconButton
              variant="onlyIcon"
              Icon={FaRegTrashAlt}
              onClick={() => handleRevokeMember(item)}
              data-testid={`${dataTestIds.members.deleteMember.deleteMemberButton(
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
          data-testid={`${dataTestIds.members.membersList.root}-item-${item.email}`}
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
            data-testid={`${dataTestIds.members.membersList.root}-email-${item.email}`}
          >
            <OverflownTextTooltip
              text={item.email}
              css={{ color: "text.dark" }}
            />
          </InteractiveListColumn>
          <InteractiveListColumn gridArea={"department"}>
            <Typography color="text.dark">{item.department.label}</Typography>
          </InteractiveListColumn>
          <InteractiveListColumn gridArea={"substitute"}>
            <Typography color="text.dark">
              {item.substitute
                ? `${item.substitute.firstName} ${item.substitute.lastName}`
                : "-"}
            </Typography>
          </InteractiveListColumn>
          <InteractiveListColumn alignItems={"flex-end"} gridArea={"actions"}>
            <HStack gap={1}>
              <Link
                href={routes.admin.members.substitutes(item.id)}
                data-testid={dataTestIds.members.substitutes.goToSubstitutesButton(
                  item.email,
                )}
              >
                <IconButton variant="onlyIcon" Icon={FaPeopleArrows} />
              </Link>
              <IconButton
                variant="onlyIcon"
                Icon={FaRegEdit}
                onClick={() => handleUpdateMember(item)}
              />
              <IconButton
                variant="onlyIcon"
                Icon={FaRegTrashAlt}
                onClick={() => handleRevokeMember(item)}
                data-testid={dataTestIds.members.deleteMember.deleteMemberButton(
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
        {t("Keine Benutzer vorhanden")}
      </Typography>
    </Box>
  );

  const paginatedMembers = usePagination({
    parserBuilder: membersListSearchParams.pagination,
    listItems: members,
  });

  return (
    <>
      <InteractiveList<FspMemberType>
        data={paginatedMembers}
        data-testid={dataTestIds.members.membersList.root}
        itemKey={"id"}
        variant={"separated"}
        currentPageLabel={"{currentMin} - {currentMax} von {totalCount}"}
        alwaysShowGroupHeader={true}
        renderGroupHeader={renderGroupHeader}
        renderItem={renderItem}
        renderNoItems={renderNoItems}
        pageSize={parseInt(Constants.defaultPageSize)}
      />
      <RevokeMemberModal />
    </>
  );
};
