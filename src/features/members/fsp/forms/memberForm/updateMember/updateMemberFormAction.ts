"use server";

import { UpdateMemberFormState } from "@/features/members/fsp/forms/memberForm/inviteMemberFormSchema";
import { UpdateMemberFormOutputType } from "@/features/members/fsp/forms/memberForm/inviteMemberFormSchema";
import { routes } from "@/routes";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";
import { MemberRoleType } from "@/shared/backend/models/fspMembers/schema";
import { updateMemberRoles } from "@/shared/backend/models/fspMembers/server";
import { revalidatePath } from "next/cache";

export async function updateMemberFormAction(
  state: UpdateMemberFormState,
  formData: UpdateMemberFormOutputType,
): Promise<UpdateMemberFormState> {
  const roles: MemberRoleType[] = ["FinancialServiceProvider::Processor"];
  if (formData.conditionsManagement) {
    roles.push("FinancialServiceProvider::MasterDataManager");
  }

  const result = await updateMemberRoles({
    pathVariables: {
      id: formData.membershipId,
    },
    payload: {
      roles,
    },
  });

  if (result.success) {
    revalidatePath(routes.admin.members.index);
    return { error: null, message: null };
  } else {
    return handleFormRequestError(result.error);
  }
}
