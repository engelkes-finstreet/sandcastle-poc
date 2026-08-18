"use client";

import { ChangeEvent, useEffect } from "react";
import { useQueryState } from "nuqs";
import { Input } from "@finstreet/ui/components/base/Form/Input";
import { Label } from "@finstreet/ui/components/base/Form/Label";
import { Box } from "@styled-system/jsx";
import { useListActionsContext } from "@/shared/components/RenderActions/ListActionsContext";
import { usePersistedFilters } from "@/shared/hooks/usePersistedFilters";

type SearchActionProps = {
  translations: {
    label: string;
    placeholder: string;
  };
};

export function SearchAction({ translations }: SearchActionProps) {
  const { startTransition, setPagination, searchParams, registerFilter } =
    useListActionsContext();

  const [search, setSearch] = useQueryState(
    "search",
    searchParams.search.withOptions({
      shallow: false,
      startTransition,
      throttleMs: 500,
    }),
  );

  useEffect(
    () =>
      registerFilter({
        key: "search",
        reset: () => setSearch(null),
      }),
    [registerFilter, setSearch],
  );

  usePersistedFilters({
    setters: { search: setSearch },
    currentValues: { search },
    defaultValues: { search: "" },
  });

  return (
    <Box flexBasis={"100%"}>
      <Label label={translations.label}>
        <Input
          placeholder={translations.placeholder}
          value={search || ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value || null);
            setPagination(null);
          }}
        />
      </Label>
    </Box>
  );
}
