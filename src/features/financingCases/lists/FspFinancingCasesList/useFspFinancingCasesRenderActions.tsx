import { useExtracted } from "next-intl";
import { useQueryState } from "nuqs";
import { VStack } from "@styled-system/jsx";
import { useFspFinancingCasesSortByItems } from "@/features/financingCases/lists/FspFinancingCasesList/useFspFinancingCasesSortByItems";
import { useFspFinancingCasesGroupByItems } from "@/features/financingCases/lists/FspFinancingCasesList/useFspFinancingCasesGroupByItems";
import {
  fspFinancingCasesSearchParams,
  FspFinancingCasesGroupByEnum,
} from "@/features/financingCases/searchParams/fspFinancingCasesSearchParams";
import { useListActions } from "@/shared/hooks/useListActions";
import { SearchAction } from "@/shared/components/RenderActions/SearchAction";
import { GroupByAction } from "@/shared/components/RenderActions/GroupByAction";
import { SortByAction } from "@/shared/components/RenderActions/SortByAction";
import { ArchivedAction } from "@/shared/components/RenderActions/ArchivedAction";
import { ResetAction } from "@/shared/components/RenderActions/ResetAction";
import { ActionRow } from "@/shared/components/RenderActions/ActionRow";

export function useFspFinancingCasesRenderActions() {
  const sortByItems = useFspFinancingCasesSortByItems();
  const groupByItems = useFspFinancingCasesGroupByItems();
  const t = useExtracted();

  const [archived] = useQueryState(
    "archived",
    fspFinancingCasesSearchParams.archived,
  );

  const [, setGroupBy] = useQueryState(
    "groupBy",
    fspFinancingCasesSearchParams.groupBy.withOptions({ shallow: false }),
  );

  const processedGroupByItems = groupByItems.map((item) =>
    item.value === FspFinancingCasesGroupByEnum.STATUS && archived
      ? { ...item, disabled: true }
      : item,
  );

  return useListActions({
    searchParams: fspFinancingCasesSearchParams,
    translations: {
      label: t("Filter"),
    },
    children: (
      <VStack gap={4} alignItems={"stretch"} width={"full"}>
        <SearchAction
          translations={{
            label: t("Suche"),
            placeholder: t("Suchbegriff"),
          }}
        />
        <ActionRow>
          <GroupByAction
            items={processedGroupByItems}
            label={t("Gruppieren nach")}
          />
          <SortByAction items={sortByItems} label={t("Sortieren nach")} />
          <ArchivedAction
            translations={{
              active: t("Aktiv"),
              archived: t("Archiviert"),
            }}
            onChange={(nextArchived) => {
              if (nextArchived) {
                setGroupBy(FspFinancingCasesGroupByEnum.NONE);
              }
            }}
          />
          <ResetAction translations={{ label: t("Zurücksetzen") }} />
        </ActionRow>
      </VStack>
    ),
  });
}
