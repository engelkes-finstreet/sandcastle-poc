import {
  PageHeader,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { getExtracted } from "next-intl/server";
import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import { FspFinancingCasesList } from "@/features/financingCases/lists/FspFinancingCasesList";
import { SearchParams } from "nuqs";
import { fspFinancingCasesSearchParamsCache } from "@/features/financingCases/searchParams/fspFinancingCasesSearchParams";
import { Metadata } from "next";
import { Constants } from "@/shared/utils/constants";

type OperationsOverviewPageProps = {
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = {
  title: `Finanzierungsanträge | ${Constants.companyName}`,
};

export default async function OperationsFinancingCasesOverviewPage({
  searchParams,
}: OperationsOverviewPageProps) {
  const t = await getExtracted();
  const resolvedSearchParams = await searchParams;
  const { search, sortBy, groupBy, pagination, archived } =
    fspFinancingCasesSearchParamsCache.parse(resolvedSearchParams);
  return (
    <>
      <PageHeader>
        <PageHeaderTitle>
          <Headline as={"h1"}>{t("Finanzierungsanträge")}</Headline>
        </PageHeaderTitle>
      </PageHeader>
      <PageContent>
        <FspFinancingCasesList
          searchParams={{ search, sortBy, groupBy, pagination, archived }}
        />
      </PageContent>
    </>
  );
}
