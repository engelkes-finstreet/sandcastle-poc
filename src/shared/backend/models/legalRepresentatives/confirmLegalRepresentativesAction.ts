"use server";

import { LegalRepresentativesPathVariablesType } from "@/shared/backend/models/legalRepresentatives/schema";
import { confirmLegalRepresentatives } from "@/shared/backend/models/legalRepresentatives/server";

export const confirmLegalRepresentativesAction = async ({
  pathVariables,
}: {
  pathVariables: LegalRepresentativesPathVariablesType;
}) => {
  return await confirmLegalRepresentatives()({
    pathVariables,
  });
};
