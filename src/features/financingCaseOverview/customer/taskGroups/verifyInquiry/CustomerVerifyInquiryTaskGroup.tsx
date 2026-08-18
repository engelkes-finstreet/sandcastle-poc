import { TaskGroup } from "@finstreet/ui/components/patterns/TaskGroup";
import { VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import CustomerVerifyInquiryTaskPanel from "@/features/financingCaseOverview/customer/taskGroups/verifyInquiry/CustomerVerifyInquiryTaskPanel";

type CustomerVerifyInquiryTaskGroupProps = {
  financingCaseId: string;
};

export default function CustomerVerifyInquiryTaskGroup({
  financingCaseId,
}: CustomerVerifyInquiryTaskGroupProps) {
  const t = useExtracted();
  return (
    <TaskGroup label={t("Ihre Anfrage")}>
      <VStack gap={4} alignItems={"stretch"}>
        <CustomerVerifyInquiryTaskPanel financingCaseId={financingCaseId} />
      </VStack>
    </TaskGroup>
  );
}
