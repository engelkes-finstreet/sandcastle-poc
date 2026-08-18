import { FspFinancingCasesPresentationList } from "@/features/financingCases/lists/FspFinancingCasesList/FspFinancingCasesPresentationList";
import { ParsedFspFinancingCasesSearchParams } from "@/features/financingCases/searchParams/fspFinancingCasesSearchParams";
import { getFspFinancingCases } from "@/shared/backend/models/fspFinancingCases/getFspFinancingCases";

type FspFinancingCasesListProps = {
  searchParams: ParsedFspFinancingCasesSearchParams;
};

export async function FspFinancingCasesList({
  searchParams,
}: FspFinancingCasesListProps) {
  // TODO: This is a dummy function and should be replaced with a real API call in the future.
  const financingCases = await getFspFinancingCases(searchParams);

  return <FspFinancingCasesPresentationList financingCases={financingCases} />;
}
