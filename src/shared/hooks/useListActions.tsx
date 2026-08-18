"use client";

import { ReactNode, useCallback, useRef } from "react";
import { useQueryState } from "nuqs";
import { RenderActionsContainer } from "@/shared/components/RenderActions/RenderActionsContainer";
import {
  FilterParticipant,
  ListActionsContext,
} from "@/shared/components/RenderActions/ListActionsContext";
import { usePersistedFilters } from "@/shared/hooks/usePersistedFilters";
import { BaseSearchParams } from "@/shared/types/searchParams";

type UseListActionsProps = {
  searchParams: BaseSearchParams;
  translations: {
    label: string;
  };
  children: ReactNode;
};

export function useListActions({
  searchParams,
  translations,
  children,
}: UseListActionsProps) {
  return ({
    startTransition,
  }: {
    startTransition: (fn: () => void) => void;
  }) => {
    const [pagination, setPagination] = useQueryState(
      "pagination",
      searchParams.pagination.withOptions({
        shallow: false,
        throttleMs: 500,
      }),
    );

    const participantsRef = useRef<Map<string, FilterParticipant>>(new Map());

    const registerFilter = useCallback((p: FilterParticipant) => {
      participantsRef.current.set(p.key, p);
      return () => {
        participantsRef.current.delete(p.key);
      };
    }, []);

    const resetQueryState = () => {
      startTransition(() => {
        setPagination(null);
        participantsRef.current.forEach((p) => p.reset());
      });
    };

    usePersistedFilters({
      setters: { pagination: setPagination },
      currentValues: { pagination },
      defaultValues: { pagination: {} },
    });

    return (
      <ListActionsContext.Provider
        value={{
          startTransition,
          setPagination,
          searchParams,
          registerFilter,
          resetQueryState,
        }}
      >
        <RenderActionsContainer
          translations={{ actionLabel: translations.label }}
        >
          {children}
        </RenderActionsContainer>
      </ListActionsContext.Provider>
    );
  };
}
