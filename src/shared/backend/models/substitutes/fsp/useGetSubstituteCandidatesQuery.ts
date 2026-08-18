"use client";

import { useQuery } from "@tanstack/react-query";
import { SubstitutesClientService } from "./client";

type UseGetSubstituteCandidatesQueryOptions = {
  membershipId?: string | null;
};

export function useGetSubstituteCandidatesQuery({
  membershipId,
}: UseGetSubstituteCandidatesQueryOptions = {}) {
  return useQuery({
    queryKey: ["substituteCandidates", membershipId ?? "self"],
    queryFn: () => {
      if (membershipId) {
        return SubstitutesClientService.getMembershipSubstituteCandidates({
          pathVariables: { membershipId },
        });
      }
      return SubstitutesClientService.getSubstituteCandidates({});
    },
  });
}
