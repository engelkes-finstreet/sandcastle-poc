import { createBase64Parser } from "@/shared/utils/paramsBase64Parser";
import { createSearchParamsCache } from "nuqs/server";

export const membersListSearchParams = {
  pagination: createBase64Parser<Record<string, string>>().withDefault({
    members: "1",
    invitedMembers: "1",
  }),
};

export const membersListSearchParamsCache = createSearchParamsCache(
  membersListSearchParams,
);
export type ParsedMembersListSearchParams = Awaited<
  ReturnType<typeof membersListSearchParamsCache.parse>
>;
