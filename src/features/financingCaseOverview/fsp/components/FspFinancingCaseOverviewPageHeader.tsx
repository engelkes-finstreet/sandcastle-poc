import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { Box, HStack, VStack } from "@styled-system/jsx";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { Formatter } from "@finstreet/ui/components/base/Formatter";
import { routes } from "@/routes";
import { getExtracted } from "next-intl/server";
import { GetFspFinancingCaseOverviewResponseType } from "@/shared/backend/models/financingCaseOverview/fsp/server";
import { DateFormat } from "@finstreet/ui/components/base/DateFormat";
import { CaseStatusIndicator } from "@finstreet/ui/components/patterns/CaseStatusIndicator";
import { FspFinancingCaseOverviewPageHeaderActions } from "@/features/financingCaseOverview/fsp/components/FspFinancingCaseOverviewPageHeaderActions";

type FspFinancingCaseOverviewPageHeaderProps = {
  financingCaseOverviewResponse: GetFspFinancingCaseOverviewResponseType;
  financingCaseId: string;
};

export async function FspFinancingCaseOverviewPageHeader({
  financingCaseOverviewResponse,
  financingCaseId,
}: FspFinancingCaseOverviewPageHeaderProps) {
  const t = await getExtracted();

  return (
    <PageHeader>
      <PageHeaderBackButton href={routes.fsp.financingCase.list()}>
        {t("zurück zur Übersicht")}
      </PageHeaderBackButton>
      <PageHeaderTitle>
        <HStack
          justify={"space-between"}
          alignItems={"start"}
          flexDirection={{ base: "column", lg: "row" }}
        >
          <Box>
            <Headline as={"h1"}>
              {financingCaseOverviewResponse.header.company}
            </Headline>
            <VStack alignItems={"flex-start"} gap={0}>
              <HStack>
                <Typography>
                  {t("Faktoringrahmen")}{" "}
                  <Formatter
                    unit={
                      financingCaseOverviewResponse.header.loanAmount
                        .displayUnit
                    }
                    amount={
                      financingCaseOverviewResponse.header.loanAmount.amount
                    }
                    locale={"de-DE"}
                  />
                </Typography>
              </HStack>
              <Typography>
                {financingCaseOverviewResponse.header.submittedAt ? (
                  <>
                    {t("Anfrage vom")}{" "}
                    <DateFormat
                      value={financingCaseOverviewResponse.header.submittedAt}
                      type="date"
                    />
                  </>
                ) : null}
              </Typography>
            </VStack>
          </Box>
          <CaseStatusIndicator
            status={financingCaseOverviewResponse.status}
            internalStatus={financingCaseOverviewResponse.internalStatus}
            align={"right"}
          />
        </HStack>
      </PageHeaderTitle>
      <FspFinancingCaseOverviewPageHeaderActions
        flags={financingCaseOverviewResponse.flags}
        financingCaseId={financingCaseId}
      />
    </PageHeader>
  );
}
