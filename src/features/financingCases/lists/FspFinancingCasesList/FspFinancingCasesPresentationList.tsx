"use client";

import { Typography } from "@finstreet/ui/components/base/Typography";
import {
  InteractiveList,
  InteractiveListColumn,
  InteractiveListGrid,
} from "@finstreet/ui/components/patterns/InteractiveList";
import { Box, Grid, GridItem, VStack } from "@styled-system/jsx";
import { ListItems } from "@/shared/types/InteractiveListTypes";
import { FinancingCaseOverviewType } from "@/shared/backend/models/fspFinancingCases/schema";
import { fspFinancingCasesSearchParams } from "@/features/financingCases/searchParams/fspFinancingCasesSearchParams";
import { usePagination } from "@/shared/hooks/usePagination";
import { DateFormat } from "@finstreet/ui/components/base/DateFormat";
import { Formatter } from "@finstreet/ui/components/base/Formatter";
import { routes } from "@/routes";
import { useRouter } from "next/navigation";
import { dataTestIds } from "e2e/data/dataTestIds";
import { IconButton } from "@finstreet/ui/components/base/IconButton";
import { HiDotsHorizontal } from "react-icons/hi";
import { useExtracted } from "next-intl";
import { useFspFinancingCasesRenderActions } from "@/features/financingCases/lists/FspFinancingCasesList/useFspFinancingCasesRenderActions";
import { CaseStatusIndicator } from "@finstreet/ui/components/patterns/CaseStatusIndicator";

export type OperationsFinancingCasesType = FinancingCaseOverviewType[];

type OperationsFinancingCasesListProps = {
  financingCases: ListItems<OperationsFinancingCasesType>;
  onItemAction?: (item: FinancingCaseOverviewType) => void;
};

const gridTemplateAreas =
  '"inquiry inquiry details details administration administration administration processor processor status status actions"';

export const FspFinancingCasesPresentationList = ({
  financingCases,
  onItemAction,
}: OperationsFinancingCasesListProps) => {
  const router = useRouter();
  const t = useExtracted();

  const renderItem = (item: FinancingCaseOverviewType) => {
    return (
      <>
        <Grid columns={2} rowGap={8} columnGap={4} hideFrom={"lg"}>
          <GridItem colSpan={2}>
            <VStack width={"100%"} alignItems={"flex-start"} gap={1}>
              <Typography
                color={"text.black"}
                fontSize={"l"}
                fontWeight={"bold"}
              >
                {item.id.substring(0, 8)}
              </Typography>
              <Typography color={"text.light"}>
                <DateFormat value={item.createdAt.toString()} type="date" />
              </Typography>
            </VStack>
          </GridItem>
          <GridItem colSpan={2}>
            <VStack width={"100%"} alignItems={"flex-start"} gap={1}>
              <Typography color={"text.dark"}>{t("Unternehmen")}</Typography>
              <Box>{item.details.company}</Box>
            </VStack>
          </GridItem>
          <GridItem colSpan={2}>
            <VStack width={"100%"} alignItems={"flex-start"} gap={1}>
              <Typography
                color={"text.black"}
                fontSize={"l"}
                fontWeight={"bold"}
              >
                {item.details.loanAmount?.amount &&
                item.details.loanAmount?.displayUnit ? (
                  <Formatter
                    amount={item.details.loanAmount?.amount}
                    unit={item.details.loanAmount?.displayUnit}
                    maxDecimals={0}
                    minDecimals={0}
                    locale="de-DE"
                  />
                ) : (
                  <Typography>N/A</Typography>
                )}
              </Typography>
            </VStack>
          </GridItem>
          <GridItem colSpan={2}>
            <VStack width={"100%"} alignItems={"flex-start"} gap={1}>
              <Typography color={"text.dark"}>{t("Bearbeiter")}</Typography>
              <Typography as={"p"} color={"text.dark"}>
                {item.caseManager?.firstName && item.caseManager?.lastName ? (
                  <Typography>
                    {item.caseManager?.firstName} {item.caseManager?.lastName}
                  </Typography>
                ) : (
                  <Typography color={"text.light"}>
                    {t("Nicht zugewiesen")}
                  </Typography>
                )}
              </Typography>
            </VStack>
          </GridItem>
          <GridItem colSpan={2}>
            <CaseStatusIndicator status={item.status} />
          </GridItem>
          <GridItem colSpan={2}>
            <IconButton
              variant="onlyIcon"
              Icon={HiDotsHorizontal}
              onClick={(e) => {
                e.stopPropagation();
                onItemAction?.(item);
              }}
            />
          </GridItem>
        </Grid>

        <Box py={4} css={{ hideBelow: "lg" }}>
          <InteractiveListGrid
            gridTemplateAreas={gridTemplateAreas}
            data-testid={dataTestIds.operations.financingCasesList.item(
              item.id,
            )}
          >
            <InteractiveListColumn gridArea={"inquiry"}>
              <Typography
                color={"text.black"}
                fontSize={"l"}
                fontWeight={"bold"}
              >
                {item.id.substring(0, 8)}
              </Typography>
              <Typography color={"text.light"}>
                <DateFormat value={item.createdAt.toString()} type="date" />
              </Typography>
            </InteractiveListColumn>
            <InteractiveListColumn gridArea={"details"}>
              <VStack alignItems={"start"}>
                <Typography
                  color={"text.black"}
                  fontSize={"l"}
                  fontWeight={"bold"}
                >
                  {item.details.loanAmount?.amount &&
                  item.details.loanAmount?.displayUnit ? (
                    <Formatter
                      amount={item.details.loanAmount?.amount}
                      unit={item.details.loanAmount?.displayUnit}
                      maxDecimals={0}
                      minDecimals={0}
                      locale="de-DE"
                    />
                  ) : (
                    <Typography>N/A</Typography>
                  )}
                </Typography>
              </VStack>
            </InteractiveListColumn>
            <InteractiveListColumn gridArea={"administration"}>
              <Box>{item.details.company}</Box>
            </InteractiveListColumn>
            <InteractiveListColumn gridArea={"processor"}>
              <Typography as={"p"} color={"text.dark"}>
                {item.caseManager?.firstName && item.caseManager?.lastName ? (
                  <Typography>
                    {item.caseManager?.firstName} {item.caseManager?.lastName}
                  </Typography>
                ) : (
                  <Typography color={"text.light"}>
                    {t("Nicht zugewiesen")}
                  </Typography>
                )}
              </Typography>
            </InteractiveListColumn>
            <InteractiveListColumn gridArea={"status"}>
              <CaseStatusIndicator status={item.status} />
            </InteractiveListColumn>
            <InteractiveListColumn gridArea={"actions"} alignItems={"flex-end"}>
              <IconButton
                variant="onlyIcon"
                Icon={HiDotsHorizontal}
                onClick={() => {
                  onItemAction?.(item);
                }}
              />
            </InteractiveListColumn>
          </InteractiveListGrid>
        </Box>
      </>
    );
  };

  const renderGroupHeader = () => {
    return (
      <InteractiveListGrid gridTemplateAreas={gridTemplateAreas}>
        <InteractiveListColumn gridArea={"inquiry"}>
          <Typography as={"p"} color={"text.dark"}>
            {t("Anfrage")}
          </Typography>
        </InteractiveListColumn>
        <InteractiveListColumn gridArea={"details"}>
          <Typography as={"p"} color={"text.dark"}>
            {t("Factoring-Rahmen")}
          </Typography>
        </InteractiveListColumn>
        <InteractiveListColumn gridArea={"administration"}>
          <Typography as={"p"} color={"text.dark"}>
            {t("Unternehmen")}
          </Typography>
        </InteractiveListColumn>
        <InteractiveListColumn gridArea={"processor"}>
          <Typography as={"p"} color={"text.dark"}>
            {t("Bearbeiter")}
          </Typography>
        </InteractiveListColumn>
        <InteractiveListColumn gridArea={"status"}>
          <Typography as={"p"} color={"text.dark"}>
            {t("Status")}
          </Typography>
        </InteractiveListColumn>
        <InteractiveListColumn gridArea={"actions"}>
          {null}
        </InteractiveListColumn>
      </InteractiveListGrid>
    );
  };

  const renderNoItems = () => {
    return (
      <Box py={12}>
        <Typography as={"p"} color={"text.dark"} textAlign={"center"}>
          {t("Keine Anfragen vorhanden")}
        </Typography>
      </Box>
    );
  };

  const renderActions = useFspFinancingCasesRenderActions();

  const onItemInteract = (item: FinancingCaseOverviewType) => {
    router.push(routes.fsp.financingCase.overview(item.id));
  };

  const paginatedFinancingCases = usePagination({
    parserBuilder: fspFinancingCasesSearchParams.pagination,
    listItems: financingCases,
  });

  return (
    <InteractiveList<FinancingCaseOverviewType>
      data={paginatedFinancingCases}
      data-testid={dataTestIds.operations.financingCasesList.root}
      itemKey={"id"}
      variant={"separated"}
      currentPageLabel={"{currentMin} - {currentMax} von {totalCount}"}
      renderGroupHeader={renderGroupHeader}
      renderItem={renderItem}
      onItemInteract={onItemInteract}
      renderNoItems={renderNoItems}
      renderActions={renderActions}
    />
  );
};
