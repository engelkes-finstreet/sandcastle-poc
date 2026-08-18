"use client";

import { useGetSubstituteCandidatesQuery } from "@/shared/backend/models/substitutes/fsp/useGetSubstituteCandidatesQuery";

type UseSubstituteCandidatesOptionsParams = {
  membershipId?: string | null;
};

export function useSubstituteCandidatesOptions({
  membershipId,
}: UseSubstituteCandidatesOptionsParams = {}) {
  const { data: candidates } = useGetSubstituteCandidatesQuery({
    membershipId,
  });

  if (!candidates) {
    return [];
  }

  return candidates.map((candidate) => ({
    label: `${candidate.firstName} ${candidate.lastName} - ${candidate.roleNames.map((role) => role.label).join(", ")}`,
    value: candidate.id,
  }));
}
