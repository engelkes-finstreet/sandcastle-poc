"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { getCaseManagerCandidates } from "@/features/assignCaseManager/fsp/backend/client";

type UseGetCaseManagerCandidatesQueryOptions = {
  financingCaseId: string;
};

export function useGetCaseManagerCandidatesQuery({
  financingCaseId,
}: UseGetCaseManagerCandidatesQueryOptions) {
  return useSuspenseQuery({
    queryKey: ["caseManagerCandidates", financingCaseId],
    queryFn: () =>
      getCaseManagerCandidates({
        pathVariables: { financingCaseId },
      }),
  });
}
