"use client";

import { routes } from "@/routes";
import { TextSkeleton } from "@finstreet/ui/components/base/Skeletons/TextSkeleton";
import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { Box, VStack } from "@styled-system/jsx";
import { useExtracted } from "next-intl";
import { useParams } from "next/navigation";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { usePortal } from "@/shared/context/portal/portalContext";

type SubPageHeaderSkeletonProps = {
  title: string;
};

export const SubPageHeaderSkeleton = ({
  title,
}: SubPageHeaderSkeletonProps) => {
  const t = useExtracted();
  const url = useSubPageHeaderSkeletonRedirectUrl();

  return (
    <PageHeader>
      <PageHeaderBackButton href={url}>
        {t("Zurück zur Anfrage")}
      </PageHeaderBackButton>
      <PageHeaderTitle>
        <VStack gap={1} alignItems={"flex-start"}>
          <Headline as={"h1"}>{title}</Headline>
          <Box w="70%">
            <TextSkeleton lines={1} />
          </Box>
        </VStack>
      </PageHeaderTitle>
    </PageHeader>
  );
};

function useSubPageHeaderSkeletonRedirectUrl() {
  const params = useParams();
  const { portal } = usePortal();

  if (portal === "customer") {
    return routes.customer.financingCase.overview(
      params.financingCaseId as string,
    );
  } else {
    return routes.fsp.financingCase.overview(params.financingCaseId as string);
  }
}
