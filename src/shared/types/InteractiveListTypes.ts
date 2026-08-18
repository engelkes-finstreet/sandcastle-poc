import { MetaType } from "@/shared/backend/models/common/meta";

export type ListItems<T> = Array<{
  title: string;
  items: T;
  groupKey: string;
  pagination: {
    currentPage: number;
    totalCount: number;
  };
}>;

export type GroupedResults<T> = {
  groupKey: string;
  data: T[];
  meta: MetaType | undefined;
};
