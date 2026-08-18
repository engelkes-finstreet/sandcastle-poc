import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderActions,
  PageHeaderBackButton,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { VStack } from "@styled-system/jsx";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { DateFormat } from "@finstreet/ui/components/base/DateFormat";
import { CaseStatusIndicator } from "@finstreet/ui/components/patterns/CaseStatusIndicator";
import { useExtracted } from "next-intl";
import { Formatter } from "@finstreet/ui/components/base/Formatter";
import { routes } from "@/routes";

type StatusType = {
  value: string;
  label: string;
  steppedProgressStatus: {
    current: number;
    total: number;
  };
};

type CustomerFinancingCaseOverviewPageHeaderProps = {
  company: string;
  factoringAmount: number;
  status: StatusType;
  providedAt: string;
};

export function CustomerFinancingCaseOverviewPageHeader({
  company,
  factoringAmount,
  status,
  providedAt,
}: CustomerFinancingCaseOverviewPageHeaderProps) {
  const t = useExtracted();

  return (
    <PageHeader>
      <PageHeaderBackButton href={routes.customer.financingCase.list()}>
        {t("Zurück zur Anfrage")}
      </PageHeaderBackButton>
      <PageHeaderTitle>
        <Headline as={"h1"}>{company}</Headline>
        <VStack alignItems={"flex-start"} gap={0}>
          <Typography>
            {t("Factoringrahmen")}{" "}
            <Formatter locale={"de-DE"} amount={factoringAmount} unit={"€"} />{" "}
          </Typography>
          <Typography>
            {t("Anfrage vom")} <DateFormat value={providedAt} type="date" />
          </Typography>
        </VStack>
      </PageHeaderTitle>
      <PageHeaderActions>
        <VStack alignItems={"flex-end"} gap={4}>
          <CaseStatusIndicator status={status} align="right" />
        </VStack>
      </PageHeaderActions>
    </PageHeader>
  );
}
