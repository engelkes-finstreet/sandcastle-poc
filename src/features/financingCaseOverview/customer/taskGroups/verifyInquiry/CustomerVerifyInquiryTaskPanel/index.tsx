import {
  TaskPanel,
  TaskPanelHeader,
  TaskPanelStatus,
  TaskPanelTitle,
  TaskPanelContent,
} from "@finstreet/ui/components/patterns/TaskPanel";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { Link } from "@finstreet/ui/components/base/Link";
import { HStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { FaArrowRight } from "react-icons/fa6";
import { routes } from "@/routes";

type CustomerVerifyInquiryTaskPanelProps = {
  financingCaseId: string;
};

export default function CustomerVerifyInquiryTaskPanel({
  financingCaseId,
}: CustomerVerifyInquiryTaskPanelProps) {
  const t = useExtracted();

  return (
    <TaskPanel>
      <TaskPanelHeader>
        <TaskPanelStatus status={"done"} />
        <TaskPanelTitle>{t("Factoringanfrage")}</TaskPanelTitle>
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
              "Auf Basis Ihrer Angaben berechnen wir die Factoringkonditionen.",
            )}
          </Typography>
          <Link
            href={routes.customer.financingCase.inquiryDetails(financingCaseId)}
            name={t("Zu den Anfragedetails")}
            as={"button"}
            variant={"text"}
            prefetch={true}
          >
            {t("Zu den Anfragedetails")}
            <FaArrowRight />
          </Link>
        </HStack>
      </TaskPanelContent>
    </TaskPanel>
  );
}
