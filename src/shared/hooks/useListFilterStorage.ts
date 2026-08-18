"use client";

import { usePathname } from "next/navigation";
import { useCallback } from "react";

interface ListFilterState {
  search?: string | null;
  pagination?: Record<string, string> | null;
}

const STORAGE_KEY = "listFilters";

export const useListFilterStorage = () => {
  const pathname = usePathname();

  const getFilterState = useCallback((): ListFilterState | null => {
    try {
      if (typeof window === "undefined") return null;

      const storedData = sessionStorage.getItem(STORAGE_KEY);
      if (!storedData) return null;

      const allFilters = JSON.parse(storedData);
      return allFilters[pathname] || null;
    } catch (error) {
      console.error("Failed to get filter state from session storage:", error);
      return null;
    }
  }, [pathname]);

  const saveFilterState = useCallback(
    (filterState: ListFilterState) => {
      try {
        if (typeof window === "undefined") return;

        const currentData = sessionStorage.getItem(STORAGE_KEY);
        const allFilters = currentData ? JSON.parse(currentData) : {};

        allFilters[pathname] = {
          ...allFilters[pathname],
          ...filterState,
        };

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(allFilters));
      } catch (error) {
        console.error("Failed to save filter state to session storage:", error);
      }
    },
    [pathname],
  );

  return {
    getFilterState,
    saveFilterState,
  };
};
