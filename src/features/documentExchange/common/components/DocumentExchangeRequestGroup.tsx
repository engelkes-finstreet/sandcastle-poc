"use client";

import { Box, HStack, VStack } from "@styled-system/jsx";
import { FaAngleDown } from "react-icons/fa6";
import { DocumentExchangeRequestDisplay } from "@/features/documentExchange/common/components/DocumentExchangeRequestDisplay";
import {
  CollapsibleContent,
  CollapsibleToggle,
  Collapsible,
} from "@finstreet/ui/components/patterns/Collapsible";
import { Typography } from "@finstreet/ui/components/base/Typography";
import { useExtracted } from "next-intl";
import { documentExchangeDeleteDocumentAction } from "@/features/documentExchange/common/actions/documentExchangeDeleteDocumentAction";
import { DocumentRequestItemType } from "@/shared/backend/models/common/DocumentRequestItem";

type Props = {
  requestGroup: {
    title: string;
    documents: Array<DocumentRequestItemType>;
    uploadedRequiredAmount: number;
    totalRequiredAmount: number;
    totalRequestAmount: number;
  };
  financingCaseId: string;
  editable?: boolean;
  itemsDeletable?: boolean;
};

export const DocumentExchangeRequestGroup = ({
  requestGroup,
  financingCaseId,
  editable = true,
  itemsDeletable = false,
}: Props) => {
  const t = useExtracted();

  if (requestGroup.totalRequestAmount === 0) {
    return null;
  }

  return (
    <Box>
      <Collapsible startOpen>
        <CollapsibleToggle>
          <HStack paddingBottom={4}>
            <Box color={"text.primary"}>
              <FaAngleDown />
            </Box>
            <Typography color={"text.primary"}>{requestGroup.title}</Typography>
            {requestGroup.totalRequiredAmount > 0 && (
              <Typography color={"text.dark"}>
                {t(
                  "({uploadedRequiredAmount, number} von {totalRequiredAmount, number} Pflichtdokumente eingereicht)",
                  {
                    uploadedRequiredAmount: requestGroup.uploadedRequiredAmount,
                    totalRequiredAmount: requestGroup.totalRequiredAmount,
                  },
                )}
              </Typography>
            )}
          </HStack>
        </CollapsibleToggle>
        <CollapsibleContent>
          <VStack gap={4} alignItems={"stretch"} p={1}>
            {requestGroup.documents.map((request) => {
              return (
                <DocumentExchangeRequestDisplay
                  documentRequestItem={request}
                  financingCaseId={financingCaseId}
                  editable={editable}
                  deleteDocumentAction={
                    itemsDeletable
                      ? documentExchangeDeleteDocumentAction
                      : undefined
                  }
                  key={request.id}
                />
              );
            })}
          </VStack>
        </CollapsibleContent>
      </Collapsible>
    </Box>
  );
};
