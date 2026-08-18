"use client";

// TODO: This grouping is a placeholder and needs to be replaced with a
// partner-specific implementation once a new partner integration is started.

import { DocumentRequestItemType } from "@/shared/backend/models/common/DocumentRequestItem";

export type DocumentRequestGroup = {
  title: string;
  documents: Array<DocumentRequestItemType>;
  totalRequestAmount: number;
  uploadedRequiredAmount: number;
  totalRequiredAmount: number;
};

export function useDocumentRequestGroups(
  requests: Array<DocumentRequestItemType>,
): Array<DocumentRequestGroup> {
  const group: DocumentRequestGroup = {
    title: "",
    documents: requests,
    totalRequestAmount: requests.length,
    uploadedRequiredAmount: requests.filter(
      (r) => r.required && r.documents.length > 0,
    ).length,
    totalRequiredAmount: requests.filter((r) => r.required).length,
  };

  return [group];
}
