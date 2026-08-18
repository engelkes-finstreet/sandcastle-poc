"use client";

import {
  FilterDefinition,
  useFilterRestore,
} from "@/shared/hooks/useFilterRestore";
import { useFilterSave } from "@/shared/hooks/useFilterSave";

type UsePersistedFiltersConfig<T extends Record<string, any>> = {
  currentValues: T;
} & FilterDefinition<T>;

type UsePersistedFiltersReturn = {
  hasRestored: boolean;
};

/**
 * Convenience hook that combines filter restoration and saving
 * Automatically handles the coordination between restore and save operations
 * @param definition Object containing setters, current values, and default values
 * @returns Object with hasRestored flag
 */
export const usePersistedFilters = <T extends Record<string, any>>(
  definition: UsePersistedFiltersConfig<T>,
): UsePersistedFiltersReturn => {
  // Restore filters from session storage
  const hasRestored = useFilterRestore({
    setters: definition.setters,
    defaultValues: definition.defaultValues,
  });

  // Save current filter state (waits for restoration to complete)
  useFilterSave(definition.currentValues, hasRestored);

  return { hasRestored };
};
