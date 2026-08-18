import { createBase64Parser } from "@/shared/utils/paramsBase64Parser";
import {
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
  createSearchParamsCache,
} from "nuqs/server";

export enum FspFinancingCasesSortByEnum {
  CREATED_AT_ASC = "created_at asc",
  CREATED_AT_DESC = "created_at desc",
  STATUS_ASC = "status asc",
  STATUS_DESC = "status desc",
  LOAN_AMOUNT_ASC = "loan_amount asc",
  LOAN_AMOUNT_DESC = "loan_amount desc",
}

export enum FspFinancingCasesGroupByEnum {
  NONE = "none",
  STATUS = "status",
  ASSIGNED_BANK_EMPLOYEE = "assigned_bank_employee",
}

export const fspFinancingCasesSearchParams = {
  search: parseAsString.withDefault(""),
  groupBy: parseAsStringEnum<FspFinancingCasesGroupByEnum>(
    Object.values(FspFinancingCasesGroupByEnum),
  ).withDefault(FspFinancingCasesGroupByEnum.NONE),
  sortBy: parseAsStringEnum<FspFinancingCasesSortByEnum>(
    Object.values(FspFinancingCasesSortByEnum),
  ),
  pagination: createBase64Parser<Record<string, string>>().withDefault({}),
  archived: parseAsBoolean.withDefault(false),
};

export const fspFinancingCasesSearchParamsCache = createSearchParamsCache(
  fspFinancingCasesSearchParams,
);

export type ParsedFspFinancingCasesSearchParams = Awaited<
  ReturnType<typeof fspFinancingCasesSearchParamsCache.parse>
>;
