"use client";

import { routes } from "@/routes";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Typography } from "@finstreet/ui/components/base/Typography";
import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { VStack } from "@styled-system/jsx";
import { ReactElement } from "react";
import { useExtracted } from "next-intl";
import { dataTestIds } from "e2e/data/dataTestIds";

type FSPCaseDetailsPageSubHeaderProps = {
  title: string;
  financingCaseId: string;
  company: string;
  actionComponent?: ReactElement;
};

export const FspFinancingCaseOverviewSubPageHeader = ({
  title,
  financingCaseId,
  company,
  actionComponent,
}: FSPCaseDetailsPageSubHeaderProps) => {
  const t = useExtracted();

  return (
    <PageHeader>
      <PageHeaderBackButton
        data-testid={dataTestIds.buttons.backButton}
        href={routes.fsp.financingCase.overview(financingCaseId)}
      >
        {t("zurück")}
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
