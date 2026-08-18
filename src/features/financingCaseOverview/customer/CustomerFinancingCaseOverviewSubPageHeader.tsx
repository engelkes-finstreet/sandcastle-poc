import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { routes } from "@/routes";
import { VStack } from "@styled-system/jsx";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useExtracted } from "next-intl";

type CustomerFinancingCaseOverviewSubPageHeaderProps = {
  financingCaseId: string;
  title: string;
  company: string;
  actionsComponent?: React.ReactNode;
};

export default function CustomerFinancingCaseOverviewSubPageHeader({
  financingCaseId,
  company,
  title,
  actionsComponent,
}: CustomerFinancingCaseOverviewSubPageHeaderProps) {
  const t = useExtracted();

  return (
    <PageHeader>
      <PageHeaderBackButton
        href={routes.customer.financingCase.overview(financingCaseId)}
      >
        {t("Zurück zur Anfrage")}
      </PageHeaderBackButton>
      <PageHeaderTitle>
        <VStack alignItems={"flex-start"} gap={1}>
          <Headline as={"h1"}>{title}</Headline>
          <Typography fontSize={"md"}>{company}</Typography>
        </VStack>
      </PageHeaderTitle>
      {actionsComponent}
    </PageHeader>
  );
}
