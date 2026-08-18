"use client";

import { useEffect } from "react";
import { useQueryState } from "nuqs";
import { Box } from "@styled-system/jsx";
import { ToggleGroup } from "@finstreet/ui/components/base/ToggleGroup";
import { useListActionsContext } from "@/shared/components/RenderActions/ListActionsContext";

enum ArchivedEnum {
  ACTIVE = "active",
  ARCHIVED = "archived",
}

type ArchivedActionProps = {
  translations: {
    active: string;
    archived: string;
  };
  onChange?: (nextArchived: boolean) => void;
};

export function ArchivedAction({ translations, onChange }: ArchivedActionProps) {
  const { startTransition, setPagination, searchParams, registerFilter } =
    useListActionsContext();

  if (!searchParams.archived) {
    throw new Error(
      "<ArchivedAction /> requires `archived` to be defined on the list's searchParams.",
    );
  }

  const [archived, setArchived] = useQueryState(
    "archived",
    searchParams.archived.withOptions({ shallow: false }),
  );

  useEffect(
    () =>
      registerFilter({
        key: "archived",
        reset: () => setArchived(null),
      }),
    [registerFilter, setArchived],
  );

  const handleToggle = (value: string) => {
    const nextArchived = value === ArchivedEnum.ARCHIVED;
    startTransition(() => {
      setArchived(nextArchived);
      setPagination(null);
      onChange?.(nextArchived);
    });
  };

  return (
    <Box width={{ base: "full", lg: "auto" }}>
      <ToggleGroup
        value={archived ? [ArchivedEnum.ARCHIVED] : [ArchivedEnum.ACTIVE]}
        onValueChange={(value) => handleToggle(value[0])}
        options={[
          { value: ArchivedEnum.ACTIVE, label: translations.active },
          { value: ArchivedEnum.ARCHIVED, label: translations.archived },
        ]}
        css={{ display: "flex", flexDirection: "row" }}
      />
    </Box>
  );
}
