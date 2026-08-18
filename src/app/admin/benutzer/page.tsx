import { PageContent } from "@finstreet/ui/components/pageLayout/PageContent";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderTitle,
} from "@finstreet/ui/components/pageLayout/PageHeader";
import { Flex } from "@styled-system/jsx";
import { Suspense } from "react";
import { ListSkeleton } from "@finstreet/ui/components/base/Skeletons/ListSkeleton";
import { MembersList } from "@/features/members/fsp/lists/MembersList";
import { InviteMemberModal } from "@/features/members/fsp/modals/InviteMembersModal";
import { OpenInviteMemberModalButton } from "@/features/members/fsp/modals/InviteMembersModal/OpenInviteMemberModalButton";
import { MembersPendingInvitationsList } from "@/features/members/fsp/lists/MembersPendingInvitationsList";
import { fetchWithErrorHandling } from "@/shared/backend/fetchWithErrorHandling";
import {
  getDepartmentOptions,
  getSigningGroupOptions,
} from "@/shared/backend/models/memberships/server";
import { getExtracted } from "next-intl/server";
import { SearchParams } from "nuqs";
import { membersListSearchParamsCache } from "@/features/members/fsp/lists/MembersList/MembersListSearchParams";
import { Headline } from "@finstreet/ui/components/base/Headline";
import { UpdateMemberModal } from "@/features/members/fsp/modals/UpdateMemberModal/modal";

type AdminMembersPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function AdminMembersPage({
  searchParams,
}: AdminMembersPageProps) {
  const t = await getExtracted();
  const resulvedSearchParams = await searchParams;
  const { pagination } =
    membersListSearchParamsCache.parse(resulvedSearchParams);
  const departmentOptionsPromise = fetchWithErrorHandling(() =>
    getDepartmentOptions({}),
  );
  const signingGroupOptionsPromise = await fetchWithErrorHandling(() =>
    getSigningGroupOptions({}),
  );

  const [departmentOptions, signingGroupOptions] = await Promise.all([
    departmentOptionsPromise,
    signingGroupOptionsPromise,
  ]);

  return (
    <>
      <PageHeader>
        <PageHeaderTitle>
          <Headline as={"h1"}>{t("Benutzerverwaltung")}</Headline>
        </PageHeaderTitle>
        <PageHeaderActions>
          <Flex justify={"end"}>
            <OpenInviteMemberModalButton
              departmentOptions={departmentOptions}
              signingGroupOptions={signingGroupOptions}
            />
          </Flex>
        </PageHeaderActions>
      </PageHeader>

      <PageContent>
        <Suspense
          fallback={<ListSkeleton key={"ListSkeletonMembers"} length={5} />}
        >
          <MembersList
            searchParams={{
              pagination,
            }}
          />
        </Suspense>

        <Suspense
          fallback={
            <ListSkeleton key={"ListSkeletonPendingInvitations"} length={5} />
          }
        >
          <MembersPendingInvitationsList
            searchParams={{
              pagination,
            }}
          />
        </Suspense>
      </PageContent>
      <InviteMemberModal />
      <UpdateMemberModal
        departments={departmentOptions}
        signingGroups={signingGroupOptions}
      />
    </>
  );
}
