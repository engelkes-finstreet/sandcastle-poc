import { Browser, expect } from "@playwright/test";
import { AcceptInvitationPage } from "e2e/pages/auth/AcceptInvitationPage";
import { MailtrapHelper } from "./MailtrapHelper";

/**
 * Helper class for handling invitation-related operations in tests
 */
export class InvitationHelper {
  /**
   * Waits for an invitation email and extracts the invitation link
   * @param email - The email address to check for invitation
   * @param mailtrapHelper - The MailtrapHelper instance to use
   * @returns Promise that resolves with the invitation link
   * @throws Error if no email is received or no invitation link is found
   */
  static async waitForInvitationEmailAndExtractLink(
    email: string,
    mailtrapHelper: MailtrapHelper,
  ): Promise<string> {
    // Wait for and verify the invitation email
    const receivedEmail = await mailtrapHelper.waitForEmail(email);
    expect(receivedEmail).toBeTruthy();
    expect(receivedEmail?.subject).toBeDefined();

    if (!receivedEmail) {
      throw new Error("No invitation email received");
    }

    // Extract invitation link from email
    const invitationLink = await mailtrapHelper.extractInvitationLink(
      receivedEmail.id,
    );

    if (!invitationLink) {
      throw new Error("No invitation link found in email");
    }

    return invitationLink;
  }

  /**
   * Accepts an invitation link in a new browser context
   * @param browser - The browser instance to create a new context from
   * @param invitationLink - The invitation URL to navigate to
   * @param password - The password to set for the new user
   * @returns Promise that resolves when invitation is accepted
   */
  static async acceptInvitationInNewContext(
    browser: Browser,
    invitationLink: string,
    password: string,
  ): Promise<void> {
    const newUserContext = await browser.newContext();
    const newUserPage = await newUserContext.newPage();

    try {
      // Navigate to the invitation link
      await newUserPage.goto(invitationLink);

      // Create AcceptInvitationPage instance and accept the invitation
      const acceptInvitationPage = new AcceptInvitationPage(newUserPage);
      await acceptInvitationPage.acceptInvitation(password);

      // Verify the invitation was accepted successfully
      const invitationAccepted =
        await acceptInvitationPage.isInvitationAccepted();
      expect(invitationAccepted).toBeTruthy();
    } finally {
      // Always close the context to clean up resources
      await newUserContext.close();
    }
  }
}
