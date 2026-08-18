"use client";

import { useEffect } from "react";
import { useQueryState } from "nuqs";
import { Label } from "@finstreet/ui/components/base/Form/Label";
import { Select, SelectItems } from "@finstreet/ui/components/base/Form/Select";
import { Box } from "@styled-system/jsx";
import { useListActionsContext } from "@/shared/components/RenderActions/ListActionsContext";
import { usePersistedFilters } from "@/shared/hooks/usePersistedFilters";

type SortByActionProps = {
  items: SelectItems;
  label: string;
};

export function SortByAction({ items, label }: SortByActionProps) {
  const { startTransition, setPagination, searchParams, registerFilter } =
    useListActionsContext();

  const [sortBy, setSortBy] = useQueryState(
    "sortBy",
    searchParams.sortBy.withOptions({
      shallow: false,
      startTransition,
      throttleMs: 500,
    }),
  );

  useEffect(
    () =>
      registerFilter({
        key: "sortBy",
        reset: () => setSortBy(null),
      }),
    [registerFilter, setSortBy],
  );

  usePersistedFilters({
    setters: { sortBy: setSortBy },
    currentValues: { sortBy },
    defaultValues: { sortBy: null },
  });

  return (
    <Box flexBasis={"100%"}>
      <Label label={label}>
        <Select
          items={items}
          value={[sortBy || ""]}
          onValueChange={(details) => {
            setSortBy(details.value[0] as any);
            setPagination(null);
          }}
        />
      </Label>
    </Box>
  );
}
