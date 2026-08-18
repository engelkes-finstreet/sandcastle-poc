import { useExtracted } from "next-intl";
import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { routes } from "@/routes";
import { VStack } from "@styled-system/jsx";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Typography } from "@finstreet/ui/components/base/Typography";

type FspFinancingCaseOverviewSubPageHeaderProps = {
  title: string;
  financingCaseId: string;
  company: string;
  actionComponent?: React.ReactNode;
};

export default function FspFinancingCaseOverviewSubPageHeader({
  title,
  financingCaseId,
  company,
  actionComponent,
}: FspFinancingCaseOverviewSubPageHeaderProps) {
  const t = useExtracted();
  return (
    <PageHeader>
      <PageHeaderBackButton
        href={routes.fsp.financingCase.overview(financingCaseId)}
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
}
