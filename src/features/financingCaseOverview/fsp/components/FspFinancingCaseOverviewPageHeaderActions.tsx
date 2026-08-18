"use client";

import { PageHeaderActions } from "@finstreet/ui/components/pageLayout/PageHeader";
import {
  MultiActionButtonItem,
  MultiActionButton,
} from "@finstreet/ui/components/patterns/MultiActionButton";
import { useExtracted } from "next-intl";
import { useAssignFinancingCaseModal } from "@/features/assignCaseManager/fsp/modals/assignFinancingCaseModal/store";
import { FspFinancingCaseOverviewFlagsType } from "@/shared/backend/models/financingCaseOverview/fsp/schema";
import { useArchiveFinancingCaseModal } from "@/features/archiveFinancingCase/fsp/modals/archiveFinancingCaseModal/store";
import { useAnonymizeFinancingCaseModal } from "@/features/anonymizeFinancingCase/fsp/modals/anonymizeFinancingCaseModal/store";

type Props = {
  flags: FspFinancingCaseOverviewFlagsType;
  financingCaseId: string;
};

export const FspFinancingCaseOverviewPageHeaderActions = ({
  flags,
  financingCaseId,
}: Props) => {
  const t = useExtracted();
  const { setData: openArchiveModal } = useArchiveFinancingCaseModal();
  const { setData: openAnonymizeModal } = useAnonymizeFinancingCaseModal();
  const { setData: openAssignFinancingCaseModal } =
    useAssignFinancingCaseModal();

  const renderItems = () => [
    <MultiActionButtonItem
      key={"archive"}
      onClick={() => openArchiveModal({ financingCaseId })}
      disabled={!flags.archivable}
      disabledHint={t("Der Fall kann zur Zeit nicht archiviert werden")}
    >
      {t("Archivieren")}
    </MultiActionButtonItem>,
    <MultiActionButtonItem
      key={"anonymize"}
      disabled={!flags.userAnonymizable}
      disabledHint={t("Der Fall kann zur Zeit nicht anonymisiert werden")}
      onClick={() => openAnonymizeModal({ financingCaseId })}
    >
      {t("Anonymisieren")}
    </MultiActionButtonItem>,
  ];

  return (
    <>
      <PageHeaderActions fullWidth={true}>
        <MultiActionButton
          mainActionDisabled={!flags.mutable}
          disabledHint={t("Der Fall kann zur Zeit nicht weitergeleitet werden")}
          onClick={() => openAssignFinancingCaseModal({ financingCaseId })}
          renderItems={renderItems}
        >
          {t("Weiterleiten")}
        </MultiActionButton>
      </PageHeaderActions>
    </>
  );
};
