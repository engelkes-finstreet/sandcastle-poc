import { ParsedMembersListSearchParams } from "@/features/members/fsp/lists/MembersList/MembersListSearchParams";

import { buildApiUrl } from "@/shared/backend/models/common/buildApiUrl";
import { collectPaginatedData } from "@/shared/backend/models/common/collectPaginatedData";
import { getPendingInvitations } from "@/shared/backend/models/fspMembers/server";
import { Constants } from "@/shared/utils/constants";
import { getExtracted } from "next-intl/server";

export async function getPendingFspInvitations(
  searchParams: ParsedMembersListSearchParams,
) {
  const { pagination } = searchParams;
  const t = await getExtracted();
  const currentPage = pagination["invitedMembers"] || "1";
  const apiUrl = buildApiUrl({
    baseUrl: "/financial_service_provider/invitations/pending",
    searchParams: {},
    additionalParams: {
      page: currentPage,
      limit: Constants.defaultPageSize,
    },
  });

  return collectPaginatedData({
    apiUrl,
    title: t("Eingeladene Benutzer"),
    groupKey: "invitedMembers",
    apiCall: () => getPendingInvitations(apiUrl)({}),
  });
}
