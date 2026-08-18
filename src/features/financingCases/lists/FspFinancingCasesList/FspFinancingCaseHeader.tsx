"use client";

import {
  PageHeader,
  PageHeaderActions,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { HStack } from "@styled-system/jsx";
import { ReactNode } from "react";

type FinancingCasesPageHeaderProps = {
  title: string;
  actions?: ReactNode;
};

export const OperationsFinancingCasesPageHeader = ({
  title,
  actions,
}: FinancingCasesPageHeaderProps) => {
  return (
    <PageHeader>
      <PageHeaderTitle>
        <Headline as={"h1"}>{title}</Headline>
      </PageHeaderTitle>
      {actions ? (
        <PageHeaderActions>
          <HStack justifyContent={"flex-end"} gap={4}>
            {actions}
          </HStack>
        </PageHeaderActions>
      ) : null}
    </PageHeader>
  );
};
