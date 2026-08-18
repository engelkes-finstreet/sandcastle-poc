"use client";

import { Button } from "@finstreet/ui/components/base/Button";
import { Box } from "@styled-system/jsx";
import { useListActionsContext } from "@/shared/components/RenderActions/ListActionsContext";

type ResetActionProps = {
  translations: {
    label: string;
  };
};

export function ResetAction({ translations }: ResetActionProps) {
  const { resetQueryState } = useListActionsContext();

  return (
    <Box
      height={15}
      display={"flex"}
      justifyContent={"flex-end"}
      alignItems={"stretch"}
    >
      <Button onClick={resetQueryState} variant={"text"}>
        {translations.label}
      </Button>
    </Box>
  );
}
