import { AssignSubstituteDefaultValues } from "./assignSubstituteSchema";

type GetAssignSubstituteDefaultValuesParams = {
  membershipId?: string | null;
};

export function getAssignSubstituteDefaultValues({
  membershipId,
}: GetAssignSubstituteDefaultValuesParams = {}) {
  const defaultValues = {
    substitudeId: undefined,
    membershipId: membershipId ?? undefined,
  } as const satisfies AssignSubstituteDefaultValues;

  return defaultValues;
}
