import { buildApiUrl } from "@/shared/backend/models/common/buildApiUrl";
import { MetaType } from "@/shared/backend/models/common/meta";
import { GroupConfig } from "@/shared/types/GroupConfig";
import { GroupedResults, ListItems } from "@/shared/types/InteractiveListTypes";
import { Constants } from "@/shared/utils/constants";

interface CollectGroupedDataConfig<TApiResult> {
  searchParams: Record<string, any>;
  groupConfig: GroupConfig;
  path: string;
  titles: Record<string, string>;
  apiCall: (apiUrl: string) => Promise<TApiResult>;
}

export async function collectGroupedData<
  TItem,
  TApiResult extends {
    success: boolean;
    data?: {
      response: TItem[];
      meta: MetaType;
    };
  },
>(config: CollectGroupedDataConfig<TApiResult>): Promise<ListItems<TItem[]>> {
  const { pagination } = config.searchParams;

  const results: GroupedResults<TItem>[] = await Promise.all(
    config.groupConfig.values.map(async (value) => {
      const apiUrl = buildApiUrl({
        baseUrl: config.path,
        searchParams: config.searchParams,
        additionalParams: {
          [config.groupConfig.queryParam]: value,
          page: pagination[value] || "1",
          limit: Constants.defaultPageSize,
        },
      });

      const result = await config.apiCall(apiUrl);

      if (result.success && result.data) {
        return {
          groupKey: value,
          data: result.data.response,
          meta: result.data.meta,
        };
      } else {
        return {
          groupKey: value,
          data: [],
          meta: undefined,
        };
      }
    }),
  );

  const filteredResults = results.filter((group) => group.data.length > 0);

  if (filteredResults.length > 0) {
    return filteredResults.map((group) => ({
      title: config.titles[group.groupKey],
      groupKey: group.groupKey,
      items: group.data,
      pagination: {
        currentPage: group.meta?.pagination.page || 1,
        totalCount: group.meta?.pagination.count || 0,
      },
    }));
  }

  return [] as ListItems<TItem[]>;
}
