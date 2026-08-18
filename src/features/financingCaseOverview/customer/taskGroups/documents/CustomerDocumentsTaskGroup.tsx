import { TaskGroup } from "@finstreet/ui/components/patterns/TaskGroup";
import { VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import CustomerDownloadDocumentsTaskPanel from "@/features/financingCaseOverview/customer/taskGroups/documents/CustomerDownloadDocumentsTaskPanel";

type Document = {
  id: string;
  name: string;
  providedAt: string;
};

type CustomerDocumentsTaskGroupProps = {
  documents: Document[];
};

export default function CustomerDocumentsTaskGroup({
  documents,
}: CustomerDocumentsTaskGroupProps) {
  const t = useExtracted();

  return (
    <TaskGroup label={t("Ihre Unterlagen")}>
      <VStack gap={4} alignItems={"stretch"}>
        <CustomerDownloadDocumentsTaskPanel documents={documents} />
      </VStack>
    </TaskGroup>
  );
}
