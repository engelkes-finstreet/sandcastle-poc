"use server";

import {
  InviteMemberFormOutputType,
  InviteMemberFormState,
} from "@/features/members/fsp/forms/memberForm/inviteMemberFormSchema";
import { routes } from "@/routes";
import { handleFormRequestError } from "@/shared/backend/handleFormRequestError";
import { MemberRoleType } from "@/shared/backend/models/fspMembers/schema";
import { inviteMember } from "@/shared/backend/models/fspMembers/server";
import { DepartmentType } from "@/shared/backend/models/memberships/schema";
import { SigningGroupType } from "@/shared/backend/models/memberships/schema";
import { revalidatePath } from "next/cache";

export async function inviteMemberFormAction(
  state: InviteMemberFormState,
  formData: InviteMemberFormOutputType,
): Promise<InviteMemberFormState> {
  const roles: MemberRoleType[] = ["FinancialServiceProvider::Processor"];
  if (formData.conditionsManagement) {
    roles.push("FinancialServiceProvider::MasterDataManager");
  }

  const result = await inviteMember({
    payload: {
      email: formData.email,
      roles,
      firstName: formData.firstName,
      lastName: formData.lastName,
      department: formData.department as DepartmentType,
      signingGroup: formData.signingGroup as SigningGroupType,
    },
  });

  if (result.success) {
    revalidatePath(routes.admin.members.index);
    return { error: null, message: null };
  } else {
    return handleFormRequestError(result.error);
  }
}
