"use client";

import {
  TaskPanel,
  TaskPanelHeader,
  TaskPanelTitle,
  TaskPanelContent,
} from "@finstreet/ui/components/patterns/TaskPanel";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { DocumentDownload } from "@finstreet/ui/components/patterns/DocumentDownload";
import { VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { FaFile } from "react-icons/fa6";

type Document = {
  id: string;
  name: string;
  providedAt: string;
};

type CustomerDownloadDocumentsTaskPanelProps = {
  documents: Document[];
};

export default function CustomerDownloadDocumentsTaskPanel({
  documents,
}: CustomerDownloadDocumentsTaskPanelProps) {
  const t = useExtracted();

  return (
    <TaskPanel collapsible>
      <TaskPanelHeader>
        <FaFile size={24} color={"var(--colors-primary)"} />
        <TaskPanelTitle>{t("Dokumente herunterladen")}</TaskPanelTitle>
      </TaskPanelHeader>
      <TaskPanelContent>
        <VStack gap={4} pt={1} alignItems={"stretch"}>
          <Typography>
            {t(
              "Hier finden Sie alle Dokumente, die Ihnen bereitgestellt werden.",
            )}
          </Typography>
          <VStack gap={0} alignItems={"stretch"}>
            {documents.map((doc) => (
              <DocumentDownload
                key={doc.id}
                title={doc.name}
                providedAt={doc.providedAt}
                providedAtLabel={t("bereitgestellt am")}
                onDownload={() => window.alert("Download")}
              />
            ))}
          </VStack>
        </VStack>
      </TaskPanelContent>
    </TaskPanel>
  );
}
