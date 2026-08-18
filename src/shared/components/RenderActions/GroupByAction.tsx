"use client";

import { useEffect } from "react";
import { useQueryState } from "nuqs";
import { Label } from "@finstreet/ui/components/base/Form/Label";
import { Select, SelectItems } from "@finstreet/ui/components/base/Form/Select";
import { Box } from "@styled-system/jsx";
import { useListActionsContext } from "@/shared/components/RenderActions/ListActionsContext";
import { usePersistedFilters } from "@/shared/hooks/usePersistedFilters";

type GroupByActionProps = {
  items: SelectItems;
  label: string;
};

export function GroupByAction({ items, label }: GroupByActionProps) {
  const { startTransition, setPagination, searchParams, registerFilter } =
    useListActionsContext();

  const [groupBy, setGroupBy] = useQueryState(
    "groupBy",
    searchParams.groupBy.withOptions({
      shallow: false,
      startTransition,
      throttleMs: 500,
    }),
  );

  useEffect(
    () =>
      registerFilter({
        key: "groupBy",
        reset: () => setGroupBy(null),
      }),
    [registerFilter, setGroupBy],
  );

  usePersistedFilters({
    setters: { groupBy: setGroupBy },
    currentValues: { groupBy },
    defaultValues: { groupBy: null },
  });

  return (
    <Box flexBasis={"100%"}>
      <Label label={label}>
        <Select
          items={items}
          value={[groupBy || ""]}
          onValueChange={(details) => {
            setGroupBy(details.value[0] as any);
            setPagination(null);
          }}
        />
      </Label>
    </Box>
  );
}
