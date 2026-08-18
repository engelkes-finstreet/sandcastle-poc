"use server";

import { SubstitutesService } from "./server";

type StopSubstituteActionParams = {
  membershipId?: string | null;
};

export async function stopSubstituteAction({
  membershipId,
}: StopSubstituteActionParams = {}) {
  if (membershipId) {
    return await SubstitutesService.removeMembershipSubstitute({
      pathVariables: { membershipId },
    });
  }
  return await SubstitutesService.removeSubstitute({});
}
