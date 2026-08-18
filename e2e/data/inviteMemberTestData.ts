import {
  DepartmentSchema,
  SigningGroupSchema,
} from "@/shared/backend/models/memberships/schema";
import { InviteMemberFormType } from "@/features/members/fsp/forms/memberForm/inviteMemberFormSchema";
import { faker } from "@faker-js/faker";
import { YesNoOptions } from "@/shared/components/form/YesNoRadioGroup/options";

export function inviteMemberTestData(): InviteMemberFormType {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    department: DepartmentSchema.enum.sales,
    signingGroup: SigningGroupSchema.enum.group_a,
    conditionsManagement: YesNoOptions.YES,
  };
}
