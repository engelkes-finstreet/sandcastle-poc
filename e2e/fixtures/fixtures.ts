import { test as base } from "@playwright/test";
import { MemberPage } from "../pages/admin/MemberPage";
import { LoginPage } from "e2e/pages/auth/LoginPage";
import { AcceptInvitationPage } from "e2e/pages/auth/AcceptInvitationPage";

// Define the fixtures type
type MyFixtures = {
  loginPage: LoginPage;
  memberPage: MemberPage;
  acceptInvitationPage: AcceptInvitationPage;
};

// Extend base test with our fixtures
export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  memberPage: async ({ page }, use) => {
    await use(new MemberPage(page));
  },
  acceptInvitationPage: async ({ page }, use) => {
    await use(new AcceptInvitationPage(page));
  },
});

export { expect } from "@playwright/test";
