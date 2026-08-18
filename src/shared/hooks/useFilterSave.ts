"use client";

import { useEffect } from "react";
import { useListFilterStorage } from "./useListFilterStorage";

/**
 * Generic hook for saving filter state to session storage
 * Waits for restoration to complete before saving to prevent overwriting saved data
 * @param filterState The current filter state to save
 * @param hasRestored Boolean indicating if restoration is complete
 */
export const useFilterSave = <T extends Record<string, any>>(
  filterState: T,
  hasRestored: boolean,
): void => {
  const { saveFilterState } = useListFilterStorage();

  useEffect(() => {
    // Skip saving until restoration is complete to prevent overwriting saved data
    if (!hasRestored) return;

    saveFilterState(filterState);
  }, [filterState, hasRestored, saveFilterState]);
};
