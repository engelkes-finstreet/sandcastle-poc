"use client";

import {
  TaskPanel,
  TaskPanelHeader,
  TaskPanelStatus,
  TaskPanelTitle,
  TaskPanelSummary,
  TaskPanelContent,
} from "@finstreet/ui/components/patterns/TaskPanel";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { Link } from "@finstreet/ui/components/base/Link";
import { Box, HStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { FaArrowRight } from "react-icons/fa6";
import { routes } from "@/routes";

type CustomerProvideDocumentsTaskPanelProps = {
  complete: boolean;
  uploadedCount: number;
  totalCount: number;
  financingCaseId: string;
};

export default function CustomerProvideDocumentsTaskPanel({
  uploadedCount,
  totalCount,
  complete,
  financingCaseId,
}: CustomerProvideDocumentsTaskPanelProps) {
  const t = useExtracted();

  return (
    <TaskPanel>
      <TaskPanelHeader>
        <TaskPanelStatus status={complete ? "done" : "active"} />
        <TaskPanelTitle>
          {t("Notwendige Dokumente bereitstellen")}
        </TaskPanelTitle>
        <TaskPanelSummary>
          <Typography>
            {t("{uploaded, number} von {total, number} hochgeladen", {
              uploaded: uploadedCount,
              total: totalCount,
            })}
          </Typography>
        </TaskPanelSummary>
      </TaskPanelHeader>
      <TaskPanelContent>
        <HStack
          pt={1}
          justifyContent={"space-between"}
          alignItems={{ base: "flex-end", lg: "center" }}
          flexDirection={{ base: "column", lg: "row" }}
        >
          <Typography>
            {t(
              "Um eine zeitnahe Bearbeitung zu gewährleisten, stellen Sie uns bitte alle benötigten Dokumente zur Verfügung.",
            )}
          </Typography>
          <Box whiteSpace={"nowrap"}>
            <Link
              href={routes.customer.financingCase.documents(financingCaseId)}
              name={t("Zu den Dokumenten")}
              as={"button"}
              variant={"text"}
              prefetch={true}
            >
              {t("Zu den Dokumenten")}
              <FaArrowRight />
            </Link>
          </Box>
        </HStack>
      </TaskPanelContent>
    </TaskPanel>
  );
}
