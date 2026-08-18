import { ListItems } from "@/shared/types/InteractiveListTypes";

interface CollectPaginatedDataConfig<TApiResult> {
  apiUrl: string;
  title: string;
  groupKey: string;
  apiCall: () => Promise<TApiResult>;
}

export async function collectPaginatedData<
  TItem extends Array<any>,
  TApiResult extends {
    success: boolean;
    data?: {
      response: TItem;
      meta: { pagination: { page: number; count: number } };
    };
  },
>(config: CollectPaginatedDataConfig<TApiResult>): Promise<ListItems<TItem>> {
  const result = await config.apiCall();

  if (result.success && result.data) {
    const { response, meta } = result.data;

    if (response.length > 0) {
      return [
        {
          title: config.title,
          items: response,
          groupKey: config.groupKey,
          pagination: {
            currentPage: meta.pagination.page,
            totalCount: meta.pagination.count,
          },
        },
      ];
    }
  }

  return [];
}
