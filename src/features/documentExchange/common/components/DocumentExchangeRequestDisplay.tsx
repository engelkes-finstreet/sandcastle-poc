"use client";

import { useState } from "react";
import { DocumentRequest } from "@finstreet/ui/components/patterns/DocumentRequest";
import { Banner } from "@finstreet/ui/components/base/Banner";
import { DocumentRequestItemType } from "@/shared/backend/models/common/DocumentRequestItem";
import { useDocumentExchangeSwitch } from "@/features/documentExchange/store";
import documentExchangeRefetchAction from "@/features/documentExchange/common/actions/documentExchangeRefetchAction";
import { documentExchangeUploadAction } from "@/features/documentExchange/common/actions/documentExchangeUploadAction";
import { documentExchangeDownloadDocumentAction } from "@/features/documentExchange/common/actions/documentExchangeDownloadDocumentAction";
import { useExtracted } from "next-intl";
import { VStack } from "@styled-system/jsx";

type Props = {
  financingCaseId: string;
  documentRequestItem: DocumentRequestItemType;
  editable?: boolean;
  deleteDocumentAction?: (params: {
    financingCaseId: string;
    documentId: string;
    filename: string;
  }) => Promise<void>;
};

export const DocumentExchangeRequestDisplay = ({
  financingCaseId,
  documentRequestItem,
  editable = true,
  deleteDocumentAction,
}: Props) => {
  const [downloadError, setDownloadError] = useState(false);
  const { isChecked } = useDocumentExchangeSwitch();
  const t = useExtracted();

  const handleDownloadDocument = async (input: {
    financingCaseId: string;
    documentId: string;
  }) => {
    setDownloadError(false);
    const result = await documentExchangeDownloadDocumentAction(input);
    if (result.success && result.downloadUrl) {
      window.open(result.downloadUrl, "_blank");
    } else {
      setDownloadError(true);
    }
  };

  if (isChecked && documentRequestItem.documents.length > 0) {
    return;
  }

  const documents = documentRequestItem.documents.map((doc) => {
    const { tags, ...rest } = doc;

    const label = tags.find((tag) => tag.value === "new")?.human;

    return {
      label,
      ...rest,
    };
  });

  return (
    <VStack alignItems="stretch" gap={2} height="100%">
      {downloadError ? (
        <Banner type="error">
          {t("Der Download ist fehlgeschlagen. Bitte versuchen Sie es erneut.")}
        </Banner>
      ) : null}
      <DocumentRequest
        css={{ height: "100%" }}
        financingCaseId={financingCaseId}
        documentRequest={{
          id: documentRequestItem.id,
          description: documentRequestItem.description,
          title: documentRequestItem.title,
          documents,
          required: documentRequestItem.required,
        }}
        disabled={!editable}
        acceptedTypes={documentRequestItem.contentTypes}
        refetch={() => documentExchangeRefetchAction(financingCaseId)}
        translations={{
          optional: t("(optional)"),
          error: t("Hochladen fehlgeschlagen"),
          dropzone: t("Ziehen Sie die Datei hier hin, um sie hochzuladen"),
          acceptedTypes: t("erlaubte Dateiformate:"),
          maxFileSize: t("Maximale Dateigröße:"),
          processing: t("Hochladen..."),
          uploadedDocumentsTitle: t("Hochgeladene Dokumente"),
        }}
        deleteDocument={deleteDocumentAction}
        uploadDocument={documentExchangeUploadAction}
        downloadDocument={handleDownloadDocument}
      />
    </VStack>
  );
};
