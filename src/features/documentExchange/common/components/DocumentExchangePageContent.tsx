"use client";

import { DocumentRequestItemType } from "@/shared/backend/models/common/DocumentRequestItem";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import { useExtracted } from "next-intl";
import { DocumentExchangeRequestGroup } from "@/features/documentExchange/common/components/DocumentExchangeRequestGroup";
import { VStack } from "@styled-system/jsx";
import { useDocumentRequestGroups } from "@/features/documentExchange/useDocumentRequestGroups";

type DocumentExchangePageContentProps = {
  documentRequests: Array<DocumentRequestItemType>;
  financingCaseId: string;
  itemsDeletable?: boolean;
  editable?: boolean;
};

export const DocumentExchangePageContent = ({
  documentRequests,
  financingCaseId,
  itemsDeletable = false,
  editable = true,
}: DocumentExchangePageContentProps) => {
  const sortedRequest = useDocumentRequestGroups(documentRequests);
  const t = useExtracted();

  return (
    <>
      <PageContent>
        <Typography>
          {t(
            "Wir benötigen noch weitere Dokumente von Ihnen. Um eine zeitnahe Bearbeitung zu gewährleisten, stellen Sie uns bitte alle benötigten Dokumente zur Verfügung.",
          )}
        </Typography>
        <VStack gap={16} alignItems={"stretch"}>
          {sortedRequest.map((requestGroup) => (
            <DocumentExchangeRequestGroup
              key={requestGroup.title}
              requestGroup={requestGroup}
              financingCaseId={financingCaseId}
              editable={editable}
              itemsDeletable={itemsDeletable}
            />
          ))}
        </VStack>
      </PageContent>
    </>
  );
};
