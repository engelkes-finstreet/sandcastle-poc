"use client";

import { SubPageHeaderSkeleton } from "@/shared/components/SubPageHeaderSkeleton";
import { BoxSkeleton } from "@finstreet/ui/components/base/Skeletons/BoxSkeleton";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { CardsGridLayout } from "@finstreet/ui/components/pageLayout/Layout/CardsGridLayout";
import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import { useExtracted } from "next-intl";

export function LegalRepresentativesLoadingComponent() {
  const t = useExtracted();

  return (
    <>
      <SubPageHeaderSkeleton title={t("Vertretungsberechtigte Personen")} />
      <PageContent>
        <Typography as={"p"}>
          {t(
            "Bitte erfassen Sie alle erforderlichen Angaben zu bis zu zwei Vertretungsberechtigten, die für das Unternehmen berechtigt sind, einen Vertrag abzuschließen (Einzel- oder Gesamtvertretung).",
          )}
        </Typography>
        <CardsGridLayout columns={2}>
          <BoxSkeleton width={"100%"} height={"200"} />
          <BoxSkeleton width={"100%"} height={"200"} />
        </CardsGridLayout>
      </PageContent>
    </>
  );
}
