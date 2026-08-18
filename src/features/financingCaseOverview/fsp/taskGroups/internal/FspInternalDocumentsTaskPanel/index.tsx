"use client";

import {
  TasksAndActionsLayout,
  TasksAndActionsLayoutArea as Area,
} from "@finstreet/ui/components/pageLayout/Layout/TasksAndActionsLayout";
import {
  TaskPanel,
  TaskPanelContent,
  TaskPanelHeader,
  TaskPanelTitle,
} from "@finstreet/ui/components/patterns/TaskPanel";
import {
  ActionPanel,
  ActionPanelAction,
  ActionPanelContent,
} from "@finstreet/ui/components/patterns/ActionPanel";
import { DocumentDownload } from "@finstreet/ui/components/patterns/DocumentDownload";
import { useExtracted } from "next-intl";
import { FaFile } from "react-icons/fa6";

type InternalDocument = {
  title: string;
  documentId: string;
  providedAt: string;
};

type Props = {
  documents: InternalDocument[];
};

export const FspInternalDocumentsTaskPanel = ({ documents }: Props) => {
  const t = useExtracted();

  return (
    <TasksAndActionsLayout>
      <Area gridArea={"tasks"}>
        <TaskPanel collapsible={documents.length > 0}>
          <TaskPanelHeader>
            <FaFile size={24} color={"var(--colors-primary)"} />
            <TaskPanelTitle>{t("Interne Dokumente")}</TaskPanelTitle>
          </TaskPanelHeader>
          {documents.length > 0 && (
            <TaskPanelContent>
              {documents.map((document) => (
                <DocumentDownload
                  key={document.documentId}
                  title={document.title}
                  providedAt={document.providedAt}
                  providedAtLabel={t("bereitgestellt am")}
                  onDownload={() => window.alert("download started")}
                />
              ))}
            </TaskPanelContent>
          )}
        </TaskPanel>
      </Area>
      <Area gridArea={"actions"}>
        <ActionPanel variant={"invisible"}>
          <ActionPanelContent>
            <ActionPanelAction onClick={() => {}}>
              {t("Dokumente hochladen")}
            </ActionPanelAction>
          </ActionPanelContent>
        </ActionPanel>
      </Area>
    </TasksAndActionsLayout>
  );
};
