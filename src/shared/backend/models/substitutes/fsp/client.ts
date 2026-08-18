import { EndpointConfig } from "@finstreet/secure-fetch";
import { createClientFetchFunction } from "@/shared/backend/createClientFetchFunction";
import {
  SubstituteCandidatesSchema,
  MembershipSubstituteCandidatesSchema,
  GetMembershipSubstituteCandidatesPathVariablesSchema,
} from "./schema";

const getSubstituteCandidatesConfig = {
  protected: true,
  method: "GET",
  path: "/membership/substitute/candidates",
  resultSchema: SubstituteCandidatesSchema,
} satisfies EndpointConfig;

const getMembershipSubstituteCandidatesConfig = {
  protected: true,
  method: "GET",
  path: "/memberships/{membershipId}/substitute/candidates",
  resultSchema: MembershipSubstituteCandidatesSchema,
  pathVariablesSchema: GetMembershipSubstituteCandidatesPathVariablesSchema,
} satisfies EndpointConfig;

export const SubstitutesClientService = {
  getSubstituteCandidates: createClientFetchFunction(
    getSubstituteCandidatesConfig,
  ),
  getMembershipSubstituteCandidates: createClientFetchFunction(
    getMembershipSubstituteCandidatesConfig,
  ),
};
