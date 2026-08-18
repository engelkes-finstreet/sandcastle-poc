"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { getArchiveOptions } from "@/features/archiveFinancingCase/fsp/backend/client";

export function useGetArchiveOptionsQuery() {
  return useSuspenseQuery({
    queryKey: ["archiveOptions"],
    queryFn: () => getArchiveOptions({}),
  });
}
