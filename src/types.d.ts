import { MemberRole } from "./shared/backend/models/auth/schema";
import { ZodString } from "zod";

export type Permissions = {
  financingCase: {
    manageAssignments: boolean;
    read: boolean;
  };
  organization: {
    manageMembers: boolean;
  };
};

declare module "next-auth/jwt" {
  interface JWT {
    permissions: Permissions;
    memberRoles: MemberRole[];
    expires: number;
  }
}

declare module "next-auth" {
  interface User {
    token: string;
    permissions: Permissions;
    memberRoles: MemberRole[];
    expiresAt: number;
  }
}

declare module "zod" {
  interface ZodSchemaConstructor {
    /** A string schema that trims whitespace from the beginning and end of the string */
    trimmedString(): ZodString;
  }
}
