import { useExtracted } from "next-intl";
import { FspFinancingCasesSortByEnum } from "@/features/financingCases/searchParams/fspFinancingCasesSearchParams";

export function useFspFinancingCasesSortByItems() {
  const t = useExtracted();

  return [
    { value: "", label: t("Keine Sortierung") },
    {
      value: FspFinancingCasesSortByEnum.CREATED_AT_ASC,
      label: t("Erstellt am (aufsteigend)"),
    },
    {
      value: FspFinancingCasesSortByEnum.CREATED_AT_DESC,
      label: t("Erstellt am (absteigend)"),
    },
    {
      value: FspFinancingCasesSortByEnum.STATUS_ASC,
      label: t("Status (aufsteigend)"),
    },
    {
      value: FspFinancingCasesSortByEnum.STATUS_DESC,
      label: t("Status (absteigend)"),
    },
    {
      value: FspFinancingCasesSortByEnum.LOAN_AMOUNT_ASC,
      label: t("Betrag (aufsteigend)"),
    },
    {
      value: FspFinancingCasesSortByEnum.LOAN_AMOUNT_DESC,
      label: t("Betrag (absteigend)"),
    },
  ];
}
