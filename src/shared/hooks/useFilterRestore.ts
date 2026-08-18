"use client";

import { useEffect, useState } from "react";
import { useListFilterStorage } from "@/shared/hooks/useListFilterStorage";

export type FilterDefinition<T extends Record<string, any>> = {
  setters: {
    [K in keyof T]: (value: T[K]) => void;
  };
  defaultValues: T;
};

/**
 * Generic hook for restoring filter state from session storage
 * @param config Configuration object with setters and default values
 * @returns hasRestored - boolean indicating if restoration is complete
 */
export const useFilterRestore = <T extends Record<string, any>>(
  config: FilterDefinition<T>,
): boolean => {
  const { getFilterState } = useListFilterStorage();
  const [hasRestored, setHasRestored] = useState(false);

  useEffect(() => {
    const savedState = getFilterState();

    if (savedState) {
      // Generic restoration for any filter shape
      Object.entries(config.setters).forEach(([key, setter]) => {
        const savedValue = (savedState as Record<string, any>)[key];
        const defaultValue = config.defaultValues[key as keyof T];

        (setter as (value: any) => void)(savedValue ?? defaultValue);
      });
    }

    setHasRestored(true);
  }, [getFilterState]); // Note: Deliberately not including config to avoid unnecessary re-runs

  return hasRestored;
};
