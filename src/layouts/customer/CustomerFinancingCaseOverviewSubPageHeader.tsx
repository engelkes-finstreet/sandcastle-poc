import { ReactElement } from "react";
import { useExtracted } from "next-intl";
import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { dataTestIds } from "e2e/data/dataTestIds";
import { routes } from "@/routes";
import { VStack } from "@styled-system/jsx";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Typography } from "@finstreet/ui/components/base/Typography";

type CustomerFinancingCaseOverviewSubPageHeaderProps = {
  title: string;
  financingCaseId: string;
  company: string;
  actionComponent?: ReactElement;
};

export const CustomerFinancingCaseOverviewSubPageHeader = ({
  title,
  financingCaseId,
  company,
  actionComponent,
}: CustomerFinancingCaseOverviewSubPageHeaderProps) => {
  const t = useExtracted();

  return (
    <PageHeader>
      <PageHeaderBackButton
        data-testid={dataTestIds.buttons.backButton}
        href={routes.customer.financingCase.overview(financingCaseId)}
      >
        {t("Zurück zur Anfrage")}
      </PageHeaderBackButton>
      <PageHeaderTitle>
        <VStack gap={1} alignItems={"flex-start"}>
          <Headline as={"h1"}>{title}</Headline>
          <Typography fontSize={"md"}>{company}</Typography>
        </VStack>
      </PageHeaderTitle>
      {actionComponent}
    </PageHeader>
  );
};
