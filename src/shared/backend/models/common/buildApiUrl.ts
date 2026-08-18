interface SearchParamsWithSearch {
  search?: string;
}

interface SearchParamsWithSort {
  sortBy?: string;
}

interface SearchParamsWithArchived {
  archived?: boolean;
}

interface BuildApiUrlConfig<TSearchParams> {
  baseUrl: string;
  searchParams: TSearchParams;
  additionalParams?: Record<string, string>;
  customParamMappers?: Array<
    (searchParams: TSearchParams, queryParams: Record<string, string>) => void
  >;
}

export function buildApiUrl<TSearchParams extends SearchParamsWithSearch>({
  baseUrl,
  searchParams,
  additionalParams = {},
  customParamMappers = [],
}: BuildApiUrlConfig<TSearchParams>): string {
  const queryParams: Record<string, string> = { ...additionalParams };
  // Handle search term (common to all)
  if (searchParams.search) {
    queryParams["q[search_term]"] = encodeURIComponent(searchParams.search);
  }

  // Handle sorting if present
  if (
    "sortBy" in searchParams &&
    (searchParams as SearchParamsWithSort).sortBy
  ) {
    const sortBy = (searchParams as SearchParamsWithSort).sortBy;
    if (sortBy) {
      queryParams["q[sort]"] = encodeURIComponent(sortBy);
    }
  }

  // Handle archived if present
  if (
    "archived" in searchParams &&
    (searchParams as SearchParamsWithArchived).archived
  ) {
    queryParams["q[show_archived]"] = "true";
  }

  // Apply custom parameter mappers for specific use cases
  customParamMappers.forEach((mapper) => mapper(searchParams, queryParams));

  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
