"use client";

import { BaseFspMemberType } from "@/shared/backend/models/fspMembers/schema";
import { Typography } from "@finstreet/ui/components/base/Typography";
import {
  InteractiveList,
  InteractiveListColumn,
  InteractiveListGrid,
} from "@finstreet/ui/components/patterns/InteractiveList";
import { OverflownTextTooltip } from "@finstreet/ui/components/patterns/OverflownTextTooltip";
import { Box, Grid, GridItem, VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";

type MySubstitutesPresentationListProps = {
  data: Array<{
    title: string;
    items: BaseFspMemberType[];
  }>;
};

const gridTemplateAreas =
  '"name name name name email email email email department department department department"';

export const MySubstitutesPresentationList = ({
  data,
}: MySubstitutesPresentationListProps) => {
  const t = useExtracted();

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
    </InteractiveListGrid>
  );

  const renderSmallScreenItem = (item: BaseFspMemberType) => (
    <Grid columns={2} rowGap={8} columnGap={4}>
      <GridItem>
        <VStack width={"100%"} alignItems={"flex-start"} gap={1}>
          <Typography fontSize={"s"} color={"text.dark"}>
            {t("Name")}
          </Typography>
          <Typography color="text.light">
            {item.firstName} {item.lastName}
          </Typography>
        </VStack>
      </GridItem>
      <GridItem>
        <VStack width={"100%"} alignItems={"flex-start"} gap={1}>
          <Typography fontSize={"s"} color={"text.dark"}>
            {t("E-Mail-Adresse")}
          </Typography>
          <Typography color="text.light">{item.email}</Typography>
        </VStack>
      </GridItem>
      <GridItem>
        <VStack width={"100%"} alignItems={"flex-start"} gap={1}>
          <Typography fontSize={"s"} color={"text.dark"}>
            {t("Abteilung")}
          </Typography>
          <Typography color="text.light">{item.department.label}</Typography>
        </VStack>
      </GridItem>
    </Grid>
  );

  const renderLargeScreenItem = (item: BaseFspMemberType) => (
    <InteractiveListGrid gridTemplateAreas={gridTemplateAreas}>
      <InteractiveListColumn gridArea={"name"}>
        <OverflownTextTooltip text={`${item.firstName} ${item.lastName}`} />
      </InteractiveListColumn>
      <InteractiveListColumn gridArea={"email"}>
        <OverflownTextTooltip text={item.email} />
      </InteractiveListColumn>
      <InteractiveListColumn gridArea={"department"}>
        <Typography color={"text.black"}>{item.department.label}</Typography>
      </InteractiveListColumn>
    </InteractiveListGrid>
  );

  const renderItem = (item: BaseFspMemberType) => (
    <>
      <Box hideFrom={"lg"}>{renderSmallScreenItem(item)}</Box>
      <Box py={4} hideBelow={"lg"}>
        {renderLargeScreenItem(item)}
      </Box>
    </>
  );

  const renderNoItems = () => (
    <Box py={12} textAlign="center">
      <Typography as={"p"} color="text.light">
        {t("Sie vertreten zur Zeit niemanden")}
      </Typography>
    </Box>
  );

  return (
    <InteractiveList<BaseFspMemberType>
      data={data}
      renderGroupHeader={renderGroupHeader}
      renderItem={renderItem}
      renderNoItems={renderNoItems}
      itemKey={"id"}
      variant={"separated"}
      alwaysShowGroupHeader={true}
    />
  );
};
