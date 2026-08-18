import { EndpointConfig } from "@finstreet/secure-fetch";
import { createServerFetchFunction } from "@/shared/backend/createServerFetchFunction";
import {
  SubstitutionsSchema,
  SetSubstitutePayloadSchema,
  SetMembershipSubstitutePathVariablesSchema,
} from "./schema";

const getSubstitutionsConfig = {
  protected: true,
  method: "GET",
  path: "/membership/substitutions",
  resultSchema: SubstitutionsSchema,
} satisfies EndpointConfig;

const getMembershipSubstitutionsConfig = {
  protected: true,
  method: "GET",
  path: "/memberships/{membershipId}/substitutions",
  resultSchema: SubstitutionsSchema,
  pathVariablesSchema: SetMembershipSubstitutePathVariablesSchema,
} satisfies EndpointConfig;

const setSubstituteConfig = {
  protected: true,
  method: "PUT",
  path: "/membership/substitute",
  payloadSchema: SetSubstitutePayloadSchema,
} satisfies EndpointConfig;

const removeSubstituteConfig = {
  protected: true,
  method: "DELETE",
  path: "/membership/substitute",
} satisfies EndpointConfig;

const setMembershipSubstituteConfig = {
  protected: true,
  method: "PUT",
  path: "/memberships/{membershipId}/substitute",
  payloadSchema: SetSubstitutePayloadSchema,
  pathVariablesSchema: SetMembershipSubstitutePathVariablesSchema,
} satisfies EndpointConfig;

const removeMembershipSubstituteConfig = {
  protected: true,
  method: "DELETE",
  path: "/memberships/{membershipId}/substitute",
  pathVariablesSchema: SetMembershipSubstitutePathVariablesSchema,
} satisfies EndpointConfig;

export const SubstitutesService = {
  getSubstitutions: createServerFetchFunction(getSubstitutionsConfig),
  getMembershipSubstitutions: createServerFetchFunction(
    getMembershipSubstitutionsConfig,
  ),
  setSubstitute: createServerFetchFunction(setSubstituteConfig),
  removeSubstitute: createServerFetchFunction(removeSubstituteConfig),
  setMembershipSubstitute: createServerFetchFunction(
    setMembershipSubstituteConfig,
  ),
  removeMembershipSubstitute: createServerFetchFunction(
    removeMembershipSubstituteConfig,
  ),
};
