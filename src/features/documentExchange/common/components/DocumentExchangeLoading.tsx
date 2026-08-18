"use client";

import { SubPageHeaderSkeleton } from "@/shared/components/SubPageHeaderSkeleton";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useExtracted } from "next-intl";
import { TextSkeleton } from "@finstreet/ui/components/base/Skeletons/TextSkeleton";
import { BoxSkeleton } from "@finstreet/ui/components/base/Skeletons/BoxSkeleton";
import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import { VStack } from "@styled-system/jsx";

export default function DocumentExchangeLoading() {
  const t = useExtracted();

  return (
    <>
      <SubPageHeaderSkeleton title={t("Notwendige Dokumente bereitstellen")} />
      <PageContent>
        <Typography>
          {t(
            "Wir benötigen noch weitere Dokumente von Ihnen. Um eine zeitnahe Bearbeitung zu gewährleisten, stellen Sie uns bitte alle benötigten Dokumente zur Verfügung.",
          )}
        </Typography>
        <TextSkeleton lines={1} />
        <VStack gap={16} alignItems={"stretch"}>
          <BoxSkeleton width={"100%"} height={"250"} />
          <BoxSkeleton width={"100%"} height={"250"} />
          <BoxSkeleton width={"100%"} height={"250"} />
          <BoxSkeleton width={"100%"} height={"250"} />
          <BoxSkeleton width={"100%"} height={"250"} />
        </VStack>
      </PageContent>
    </>
  );
}
