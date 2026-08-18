"use client";

import { Switch } from "@finstreet/ui/components/base/Form/Switch";
import { PageHeaderActions } from "@finstreet/ui/components/pageLayout/PageHeader";
import { useExtracted } from "next-intl";
import { useDocumentExchangeSwitch } from "@/features/documentExchange/store";
import { CustomerFinancingCaseOverviewSubPageHeader } from "@/layouts/customer/CustomerFinancingCaseOverviewSubPageHeader";

type Props = {
  title: string;
  financingCaseId: string;
  company: string;
};

export const CustomerFinancingCaseOverviewDocumentExchangePageHeader = ({
  title,
  financingCaseId,
  company,
}: Props) => {
  const t = useExtracted();
  const { isChecked, setIsChecked } = useDocumentExchangeSwitch();

  const actionComponent = (
    <PageHeaderActions>
      <Switch
        onClick={() => setIsChecked(!isChecked)}
        checked={isChecked}
        label={t("Hochgeladene Dokumente ausblenden")}
      />
    </PageHeaderActions>
  );

  return (
    <CustomerFinancingCaseOverviewSubPageHeader
      title={title}
      financingCaseId={financingCaseId}
      company={company}
      actionComponent={actionComponent}
    />
  );
};
