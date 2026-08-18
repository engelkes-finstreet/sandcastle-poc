"use client";

import { createContext, useContext } from "react";
import { BaseSearchParams } from "@/shared/types/searchParams";

export type FilterParticipant = {
  key: string;
  reset: () => void;
};

export type ListActionsContextValue = {
  startTransition: (fn: () => void) => void;
  setPagination: (pagination: Record<string, string> | null) => void;
  searchParams: BaseSearchParams;
  registerFilter: (participant: FilterParticipant) => () => void;
  resetQueryState: () => void;
};

export const ListActionsContext = createContext<ListActionsContextValue | null>(
  null,
);

export function useListActionsContext(): ListActionsContextValue {
  const ctx = useContext(ListActionsContext);
  if (!ctx) {
    throw new Error(
      "List action slots must be rendered inside useListActions children.",
    );
  }
  return ctx;
}
