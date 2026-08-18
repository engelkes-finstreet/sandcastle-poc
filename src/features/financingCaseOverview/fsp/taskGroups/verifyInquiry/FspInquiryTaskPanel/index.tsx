import { routes } from "@/routes";
import {
  TasksAndActionsLayout,
  TasksAndActionsLayoutArea as Area,
} from "@finstreet/ui/components/pageLayout/Layout/TasksAndActionsLayout";
import {
  TaskPanel,
  TaskPanelHeader,
  TaskPanelStatus,
  TaskPanelTitle,
} from "@finstreet/ui/components/patterns/TaskPanel";
import { useExtracted } from "next-intl";

type Props = {
  financingCaseId: string;
  completed?: boolean;
};

export const FspInquiryTaskPanel = ({ financingCaseId, completed }: Props) => {
  const t = useExtracted();

  return (
    <TasksAndActionsLayout>
      <Area gridArea={"tasks"}>
        <TaskPanel
          href={routes.fsp.financingCase.inquiryDetails(financingCaseId)}
          prefetch={true}
          scroll={true}
          name={t("Konditionenanfrage")}
        >
          <TaskPanelHeader>
            <TaskPanelStatus status={completed ? "done" : "active"} />
            <TaskPanelTitle>{t("Konditionenanfrage")}</TaskPanelTitle>
          </TaskPanelHeader>
        </TaskPanel>
      </Area>
      <Area gridArea={"actions"}>
        <></>
      </Area>
    </TasksAndActionsLayout>
  );
};
