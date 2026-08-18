import { ParsedMembersListSearchParams } from "@/features/members/fsp/lists/MembersList/MembersListSearchParams";
import { buildApiUrl } from "@/shared/backend/models/common/buildApiUrl";
import { collectPaginatedData } from "@/shared/backend/models/common/collectPaginatedData";
import { getFspMembers } from "@/shared/backend/models/fspMembers/server";
import { Constants } from "@/shared/utils/constants";
import { getExtracted } from "next-intl/server";

export async function getPaginatedFspMembers(
  searchParams: ParsedMembersListSearchParams,
) {
  const { pagination } = searchParams;
  const t = await getExtracted();
  const currentPage = pagination["members"] || "1";
  const apiUrl = buildApiUrl({
    baseUrl: "/financial_service_provider/memberships",
    searchParams: {},
    additionalParams: {
      page: currentPage,
      limit: Constants.defaultPageSize,
    },
  });

  return collectPaginatedData({
    apiUrl,
    title: t("Aktive Benutzer"),
    groupKey: "members",
    apiCall: () => getFspMembers(apiUrl)({}),
  });
}
