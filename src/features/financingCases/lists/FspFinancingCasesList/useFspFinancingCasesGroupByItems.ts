import { useExtracted } from "next-intl";
import { FspFinancingCasesGroupByEnum } from "@/features/financingCases/searchParams/fspFinancingCasesSearchParams";

export function useFspFinancingCasesGroupByItems() {
  const t = useExtracted();

  return [
    {
      value: FspFinancingCasesGroupByEnum.NONE,
      label: t("Keine Gruppierung"),
    },
    {
      value: FspFinancingCasesGroupByEnum.STATUS,
      label: t("Status"),
    },
    {
      value: FspFinancingCasesGroupByEnum.ASSIGNED_BANK_EMPLOYEE,
      label: t("Zugewiesener Bankmitarbeiter"),
    },
  ];
}
