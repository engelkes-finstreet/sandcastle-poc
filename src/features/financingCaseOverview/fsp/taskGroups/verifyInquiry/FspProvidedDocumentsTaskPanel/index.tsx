"use client";

import {
  TasksAndActionsLayout,
  TasksAndActionsLayoutArea as Area,
} from "@finstreet/ui/components/pageLayout/Layout/TasksAndActionsLayout";
import {
  TaskPanel,
  TaskPanelHeader,
  TaskPanelSummary,
  TaskPanelTitle,
} from "@finstreet/ui/components/patterns/TaskPanel";
import {
  ActionPanel,
  ActionPanelAction,
  ActionPanelContent,
} from "@finstreet/ui/components/patterns/ActionPanel";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { FaFile } from "react-icons/fa6";
import { routes } from "@/routes";

type Props = {
  financingCaseId: string;
  completedCount: number;
  totalCount: number;
};

export const FspProvidedDocumentsTaskPanel = ({
  financingCaseId,
  completedCount,
  totalCount,
}: Props) => {
  const t = useExtracted();

  return (
    <TasksAndActionsLayout>
      <Area gridArea={"tasks"}>
        <TaskPanel
          href={routes.fsp.financingCase.documents(financingCaseId)}
          prefetch={true}
          scroll={true}
          name={t("Dokumente vom Kunden")}
        >
          <TaskPanelHeader>
            <FaFile size={24} color={"var(--colors-primary)"} />
            <TaskPanelTitle>{t("Dokumente vom Kunden")}</TaskPanelTitle>
            <TaskPanelSummary>
              <VStack gap={0} alignItems={"flex-end"}>
                <Typography color={"text.dark"}>{t("hochgeladen")}</Typography>
                <Typography>
                  {t.rich(
                    "<strong>{completedCount, number}</strong> von <strong>{totalCount, number}</strong>",
                    {
                      completedCount,
                      totalCount,
                      strong: (chunks) => <strong>{chunks}</strong>,
                    },
                  )}
                </Typography>
              </VStack>
            </TaskPanelSummary>
          </TaskPanelHeader>
        </TaskPanel>
      </Area>
      <Area gridArea={"actions"}>
        <ActionPanel variant={"invisible"}>
          <ActionPanelContent>
            <ActionPanelAction onClick={() => {}}>
              {t("Dokument anfordern")}
            </ActionPanelAction>
          </ActionPanelContent>
        </ActionPanel>
      </Area>
    </TasksAndActionsLayout>
  );
};
