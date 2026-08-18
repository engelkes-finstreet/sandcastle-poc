import { ListItems } from "@/shared/types/InteractiveListTypes";
import { ParserBuilder, useQueryState } from "nuqs";

export function usePagination({
  parserBuilder,
  listItems,
}: {
  parserBuilder: Omit<ParserBuilder<any>, "parseServerSide">;
  listItems: ListItems<any>;
}) {
  const [pagination, setPagination] = useQueryState(
    "pagination",
    parserBuilder.withOptions({
      shallow: false,
      throttleMs: 500,
    }),
  );

  const onPageChange = (groupKey: string, page: number) => {
    setPagination({
      ...pagination,
      [groupKey]: page.toString(),
    });
  };

  const paginatedListItems = listItems.map((element) => ({
    ...element,
    pagination: {
      ...element.pagination,
      onPageChange: (page: number) => onPageChange(element.groupKey, page),
    },
  }));

  return paginatedListItems;
}
