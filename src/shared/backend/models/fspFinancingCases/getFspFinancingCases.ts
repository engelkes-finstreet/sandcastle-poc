import { ListItems } from "@/shared/types/InteractiveListTypes";
import { OperationsFinancingCasesType } from "@/features/financingCases/lists/FspFinancingCasesList/FspFinancingCasesPresentationList";
import { ParsedFspFinancingCasesSearchParams } from "@/features/financingCases/searchParams/fspFinancingCasesSearchParams";
import { buildApiUrl } from "@/shared/backend/models/common/buildApiUrl";
import { fetchFspFinancingCases } from "./server";
import { fetchWithErrorHandling } from "@/shared/backend/fetchWithErrorHandling";

function makeGroup(
  title: string,
  groupKey: string,
  items: OperationsFinancingCasesType,
): ListItems<OperationsFinancingCasesType>[number] {
  return {
    title,
    groupKey,
    items,
    pagination: { currentPage: 1, totalCount: items.length },
  };
}

export async function getFspFinancingCases(
  searchParams: ParsedFspFinancingCasesSearchParams,
): Promise<ListItems<OperationsFinancingCasesType>> {
  const apiUrl = buildApiUrl({
    baseUrl: "/financial_service_providers/financing_cases",
    searchParams,
  });

  const result = await fetchWithErrorHandling(() =>
    fetchFspFinancingCases(apiUrl)({}),
  );


  const items = result.response as OperationsFinancingCasesType;

  return [makeGroup("Anfragen", "financingCases", items)];
}
