import { getPendingFspInvitations } from "@/shared/backend/models/fspMembers/getPendingFspInvitations";
import { ParsedMembersListSearchParams } from "@/features/members/fsp/lists/MembersList/MembersListSearchParams";
import { MembersPendingInvitationsListPresentation } from "@/features/members/fsp/lists/MembersPendingInvitationsList/MembersPendingInvitationsPresentation";

type MembersPendingInvitationsListProps = {
  searchParams: ParsedMembersListSearchParams;
};

export async function MembersPendingInvitationsList({
  searchParams,
}: MembersPendingInvitationsListProps) {
  const pendingInvitations = await getPendingFspInvitations(searchParams);

  return (
    <MembersPendingInvitationsListPresentation
      pendingInvitations={pendingInvitations}
    />
  );
}
