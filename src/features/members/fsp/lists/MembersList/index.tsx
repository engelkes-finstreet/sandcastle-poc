import { MembersListPresentation } from "@/features/members/fsp/lists/MembersList/MembersListPresentation";
import { ParsedMembersListSearchParams } from "@/features/members/fsp/lists/MembersList/MembersListSearchParams";
import { getPaginatedFspMembers } from "@/shared/backend/models/fspMembers/getFspMembers";

type MembersListProps = {
  searchParams: ParsedMembersListSearchParams;
};

export async function MembersList({ searchParams }: MembersListProps) {
  const members = await getPaginatedFspMembers(searchParams);

  return <MembersListPresentation members={members} />;
}
