"use client";

import {
  TaskPanel,
  TaskPanelHeader,
  TaskPanelStatus,
  TaskPanelTitle,
  TaskPanelContent,
} from "@finstreet/ui/components/patterns/TaskPanel";
import { SubTask } from "@finstreet/ui/components/patterns/SubTask";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { routes } from "@/routes";

type CustomerContractInformationTaskPanelProps = {
  financingCaseId: string;
  contractInformationComplete: boolean;
  legalRepresentativesComplete: boolean;
};

export default function CustomerContractInformationTaskPanel({
  financingCaseId,
  contractInformationComplete,
  legalRepresentativesComplete,
}: CustomerContractInformationTaskPanelProps) {
  const t = useExtracted();

  return (
    <TaskPanel collapsible startOpen>
      <TaskPanelHeader>
        <TaskPanelStatus
          status={contractInformationComplete ? "done" : "active"}
        />
        <TaskPanelTitle>
          {t("Informationen zum Vertragsabschluss ergänzen")}
        </TaskPanelTitle>
      </TaskPanelHeader>
      <TaskPanelContent>
        <VStack gap={0} alignItems={"stretch"} pt={1}>
          <Typography>
            {t(
              "Wir benötigen vor dem Vertragsabschluss noch einige Informationen von Ihnen. Bitte erfassen Sie die notwendigen Daten:",
            )}
          </Typography>
          <SubTask
            status={legalRepresentativesComplete ? "done" : "active"}
            href={routes.customer.financingCase.legalRepresentatives(
              financingCaseId,
            )}
            name={t("Vertretungsberechtigte Personen")}
            actionLabel={t("Daten ergänzen")}
          >
            <VStack gap={1} alignItems={"flex-start"}>
              <Typography fontWeight={"semibold"}>
                {t("Vertretungsberechtigte Personen")}
              </Typography>
              <Typography>
                {t(
                  "Bitte wählen Sie die Vertretungsberechtigten aus, die den Vertrag unterzeichnen sollen.",
                )}
              </Typography>
            </VStack>
          </SubTask>
        </VStack>
      </TaskPanelContent>
    </TaskPanel>
  );
}
