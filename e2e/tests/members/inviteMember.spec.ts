import { inviteMemberTestData } from "e2e/data/inviteMemberTestData";
import { InviteMemberFormType } from "@/features/members/fsp/forms/memberForm/inviteMemberFormSchema";
import { MailtrapHelper } from "e2e/helpers/utilities/MailtrapHelper";
import { InvitationHelper } from "e2e/helpers/utilities/InvitationHelper";
import { MemberPage } from "e2e/pages/admin/MemberPage";
import { testCredentials } from "e2e/utils/test-helpers";
import { expect, test } from "e2e/fixtures/fixtures";
import {dataTestIds} from "../../data/dataTestIds";

test.describe("Member Invitations", () => {
  let testData: InviteMemberFormType;
  let mailtrapHelper: MailtrapHelper;

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.loginAsFspAdmin(
      testCredentials.fspAdminEmail,
      testCredentials.fspAdminPassword,
    );
    testData = inviteMemberTestData();
    mailtrapHelper = new MailtrapHelper();
  });

  test("should invite a member, resend invitation, and revoke", async ({
    page,
    memberPage,
  }) => {
    await memberPage.inviteMember(testData);

    await verifyInvitationEmail(testData.email);

    await page.waitForTimeout(2000);
    await verifyMemberInPendingList(memberPage, testData.email);

    await page.waitForTimeout(2000);
    await memberPage.resendInvitation(testData.email);

    const emailCountSuccess = await mailtrapHelper.waitForEmailCount(
      testData.email,
      "Einladung für Banker",
      2,
      15000,
    );
    expect(emailCountSuccess).toBeTruthy();

    await memberPage.revokeInvitation(testData.email);

    await page.waitForTimeout(2000);
    await verifyMemberInPendingList(memberPage, testData.email);
  });

  test("should invite a member and accept the invitation", async ({
    page,
    memberPage,
    browser,
  }) => {
    await memberPage.inviteMember(testData);

    const email = await verifyInvitationEmail(testData.email);
    if (!email) {
      throw new Error("No invitation email received");
    }
    const invitationLink = await extractInvitationLinkFromEmail(email.id);

    const newUserPassword = "SecurePassword123!";
    await InvitationHelper.acceptInvitationInNewContext(
      browser,
      invitationLink,
      newUserPassword,
    );

    await page.reload();
    await page.waitForTimeout(2000);
    await verifyMemberInActiveList(memberPage, testData.email);

    await memberPage.deleteMember(testData.email);
    await page.waitForTimeout(2000);
    await verifyMemberInActiveList(memberPage, testData.email, 0);
  });

  const extractInvitationLinkFromEmail = async (emailId: number) => {
    const link = await mailtrapHelper.extractInvitationLink(emailId);
    if (!link) {
      throw new Error("No invitation link found in email");
    }
    return link;
  };

  const verifyInvitationEmail = async (
    email: string,
    expectedSubject = "Einladung für Banker",
  ) => {
    const receivedEmail = await mailtrapHelper.waitForEmail(email);
    expect(receivedEmail).toBeTruthy();
    expect(receivedEmail?.subject).toContain(expectedSubject);
    return receivedEmail;
  };

  const verifyMemberInPendingList = async (
      memberPage: MemberPage,
      email: string,
  ) => {
    const found = await memberPage.findPendingInvitationAcrossPages(email, dataTestIds.members.pendingInvitations.pendingInvitationsList.root);
    expect(found).toBeTruthy();
  };

  const verifyMemberInActiveList = async (
    memberPage: MemberPage,
    email: string,
    expectedCount = 1,
  ) => {
    const found = await memberPage.findActiveMemberAcrossPages(email, dataTestIds.members.membersList.root);
    await expect(found).toHaveCount(expectedCount);
  };
});
