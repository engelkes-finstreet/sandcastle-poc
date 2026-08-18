import { TaskGroup } from "@finstreet/ui/components/patterns/TaskGroup";
import { useExtracted } from "next-intl";
import { FspInternalRemarksTaskPanel } from "@/features/financingCaseOverview/fsp/taskGroups/internal/FspInternalRemarksTaskPanel";

type FspInternalTaskGroupProps = {
  financingCaseId: string;
  internalRemark: string | null;
  mutable: boolean;
};

export default function FspInternalTaskGroup({
  financingCaseId,
  internalRemark,
  mutable,
}: FspInternalTaskGroupProps) {
  const t = useExtracted();
  return (
    <TaskGroup label={t("Intern")}>
      <FspInternalRemarksTaskPanel
        financingCaseId={financingCaseId}
        currentInternalRemark={internalRemark}
        mutable={mutable}
      />
    </TaskGroup>
  );
}
