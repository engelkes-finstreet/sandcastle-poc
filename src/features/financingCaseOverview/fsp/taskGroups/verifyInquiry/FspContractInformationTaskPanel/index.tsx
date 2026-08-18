"use client";

import {
  TasksAndActionsLayout,
  TasksAndActionsLayoutArea as Area,
} from "@finstreet/ui/components/pageLayout/Layout/TasksAndActionsLayout";
import {
  TaskPanel,
  TaskPanelContent,
  TaskPanelHeader,
  TaskPanelStatus,
  TaskPanelTitle,
} from "@finstreet/ui/components/patterns/TaskPanel";
import { SubTask } from "@finstreet/ui/components/patterns/SubTask";
import { useExtracted } from "next-intl";
import { routes } from "@/routes";

type Props = {
  financingCaseId: string;
  completed: boolean;
  legalRepresentativesConfirm: boolean;
};

export const FspContractInformationTaskPanel = ({
  financingCaseId,
  completed,
  legalRepresentativesConfirm,
}: Props) => {
  const t = useExtracted();

  return (
    <TasksAndActionsLayout>
      <Area gridArea={"tasks"}>
        <TaskPanel collapsible startOpen>
          <TaskPanelHeader>
            <TaskPanelStatus status={completed ? "done" : "active"} />
            <TaskPanelTitle>
              {t("Informationen zum Vertragsabschluss")}
            </TaskPanelTitle>
          </TaskPanelHeader>
          <TaskPanelContent>
            <SubTask
              status={legalRepresentativesConfirm ? "done" : "active"}
              href={routes.fsp.financingCase.legalRepresentatives(
                financingCaseId,
              )}
              name={t("Vertretungsberechtigte Personen")}
              actionLabel={t("Daten einsehen")}
            >
              {t("Vertretungsberechtigte Personen")}
            </SubTask>
          </TaskPanelContent>
        </TaskPanel>
      </Area>
      <Area gridArea={"actions"}>
        <></>
      </Area>
    </TasksAndActionsLayout>
  );
};
