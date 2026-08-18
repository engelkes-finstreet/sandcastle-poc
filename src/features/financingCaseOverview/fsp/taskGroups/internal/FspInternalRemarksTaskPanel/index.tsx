"use client";

import { UpdateInternalRemarkForm } from "@/features/financingCaseOverview/fsp/forms/updateInternalRemarksForm";
import { Button } from "@finstreet/ui/components/base/Button";
import { Typography } from "@finstreet/ui/components/base/Typography";
import {
  TasksAndActionsLayout,
  TasksAndActionsLayoutArea as Area,
} from "@finstreet/ui/components/pageLayout/Layout/TasksAndActionsLayout";
import {
  TaskPanel,
  TaskPanelHeader,
  TaskPanelTitle,
  TaskPanelContent,
} from "@finstreet/ui/components/patterns/TaskPanel";
import { VStack, HStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { Fragment } from "react";
import { FaRegEdit } from "react-icons/fa";
import { FaPencil } from "react-icons/fa6";
import { create } from "zustand";

type Props = {
  financingCaseId: string;
  currentInternalRemark?: string | null;
  mutable: boolean;
};

export const FspInternalRemarksTaskPanel = ({
  financingCaseId,
  currentInternalRemark,
  mutable,
}: Props) => {
  const t = useExtracted();

  const { isEditing, setIsEditing } = useInternalRemarkPanelStore();

  return (
    <TasksAndActionsLayout>
      <Area gridArea={"tasks"}>
        <TaskPanel collapsible>
          <TaskPanelHeader>
            <FaRegEdit size={24} color={"var(--colors-primary)"} />
            <TaskPanelTitle>{t("Anmerkungen")}</TaskPanelTitle>
          </TaskPanelHeader>
          <TaskPanelContent>
            {currentInternalRemark ? (
              <>
                {isEditing ? (
                  <UpdateInternalRemarkForm
                    financingCaseId={financingCaseId}
                    currentInternalRemark={currentInternalRemark}
                  />
                ) : (
                  <VStack alignItems={"flex-start"} gap={8}>
                    <Typography color="text.black">
                      {currentInternalRemark?.split("\n").map((line, index) => (
                        <Fragment key={index}>
                          {line}
                          <br />
                        </Fragment>
                      ))}
                    </Typography>
                    <HStack justify={"flex-end"} width={"full"}>
                      <Button
                        disabled={!mutable}
                        onClick={() => setIsEditing(true)}
                        icon={<FaPencil />}
                      >
                        {t("Bearbeiten")}
                      </Button>
                    </HStack>
                  </VStack>
                )}
              </>
            ) : (
              <>
                {isEditing ? (
                  <UpdateInternalRemarkForm
                    financingCaseId={financingCaseId}
                    currentInternalRemark={currentInternalRemark}
                  />
                ) : (
                  <VStack alignItems={"flex-start"} gap={4}>
                    <Typography color="text.black">
                      {t("Noch keine internen Bemerkungen vorhanden.")}
                    </Typography>
                    <Button
                      disabled={!mutable}
                      css={{
                        alignSelf: "flex-end",
                      }}
                      icon={<FaPencil />}
                      onClick={() => setIsEditing(true)}
                    >
                      {t("Anmerkungen hinzufügen")}
                    </Button>
                  </VStack>
                )}
              </>
            )}
          </TaskPanelContent>
        </TaskPanel>
      </Area>
      <Area gridArea={"actions"}>
        <></>
      </Area>
    </TasksAndActionsLayout>
  );
};

interface InternalRemarkPanelStore {
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}

export const useInternalRemarkPanelStore = create<InternalRemarkPanelStore>(
  (set) => ({
    isEditing: false,
    setIsEditing: (isEditing) => set({ isEditing }),
  }),
);
