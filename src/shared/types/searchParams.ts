import type { ParserBuilder } from "nuqs/server";

/**
 * Generic base type for search params that enforces the required structure
 * while allowing specific types for groupBy and sortBy enums
 */
export type BaseSearchParams<
  TGroupBy extends string = any,
  TSortBy extends string = any,
> = {
  search: ParserBuilder<string>;
  groupBy: ParserBuilder<TGroupBy>;
  sortBy: ParserBuilder<TSortBy>;
  pagination: ParserBuilder<Record<string, string>>;
  archived?: ParserBuilder<boolean>;
};
