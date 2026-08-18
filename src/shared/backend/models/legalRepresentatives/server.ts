import { EndpointConfig } from "@finstreet/secure-fetch";
import { createMockServerFetchFunction } from "@/shared/backend/createMockServerFetchFunction";
import {
  GetLegalRepresentativesResponseSchema,
  PostLegalRepresentativeRequestSchema,
  LegalRepresentativesPathVariablesSchema,
  LegalRepresentativePathVariablesSchema,
} from "./schema";

const getLegalRepresentativesConfig = () => {
  return {
    protected: true,
    method: "GET",
    path: `/financing_cases/{financingCaseId}/legal_representatives`,
    pathVariablesSchema: LegalRepresentativesPathVariablesSchema,
    resultSchema: GetLegalRepresentativesResponseSchema,
  } satisfies EndpointConfig;
};

const createLegalRepresentativeConfig = () => {
  return {
    protected: true,
    method: "POST",
    path: `/financing_cases/{financingCaseId}/legal_representatives`,
    pathVariablesSchema: LegalRepresentativesPathVariablesSchema,
    payloadSchema: PostLegalRepresentativeRequestSchema,
    resultSchema: GetLegalRepresentativesResponseSchema,
  } satisfies EndpointConfig;
};

export const getLegalRepresentatives = () =>
  createMockServerFetchFunction(getLegalRepresentativesConfig());

export const createLegalRepresentative = () =>
  createMockServerFetchFunction(createLegalRepresentativeConfig());

const updateLegalRepresentativeConfig = () => {
  return {
    protected: true,
    method: "PUT",
    path: `/financing_cases/{financingCaseId}/legal_representatives/{legalRepresentativeId}`,
    pathVariablesSchema: LegalRepresentativePathVariablesSchema,
    payloadSchema: PostLegalRepresentativeRequestSchema,
    resultSchema: GetLegalRepresentativesResponseSchema,
  } satisfies EndpointConfig;
};

const deleteLegalRepresentativeConfig = () => {
  return {
    protected: true,
    method: "DELETE",
    path: `/financing_cases/{financingCaseId}/legal_representatives/{legalRepresentativeId}`,
    pathVariablesSchema: LegalRepresentativePathVariablesSchema,
    resultSchema: GetLegalRepresentativesResponseSchema,
  } satisfies EndpointConfig;
};

const confirmLegalRepresentativesConfig = () => {
  return {
    protected: true,
    method: "POST",
    path: `/financing_cases/{financingCaseId}/legal_representatives/confirm`,
    pathVariablesSchema: LegalRepresentativesPathVariablesSchema,
    resultSchema: GetLegalRepresentativesResponseSchema,
  } satisfies EndpointConfig;
};

export const updateLegalRepresentative = () =>
  createMockServerFetchFunction(updateLegalRepresentativeConfig());

export const deleteLegalRepresentative = () =>
  createMockServerFetchFunction(deleteLegalRepresentativeConfig());

export const confirmLegalRepresentatives = () =>
  createMockServerFetchFunction(confirmLegalRepresentativesConfig());
