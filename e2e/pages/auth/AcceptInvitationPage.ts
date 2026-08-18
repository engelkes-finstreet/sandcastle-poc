import { Page } from "@playwright/test";
import { BaseField } from "@finstreet/forms";
import { BasePage } from "e2e/pages/BasePage";
import { dataTestIds } from "e2e/data/dataTestIds";

export class AcceptInvitationPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Click the information panel button to proceed to the password form
   */
  async clickInformationButton() {
    await this.clickByTestId(
      dataTestIds.acceptInvitation.information.submitButton,
    );
  }

  /**
   * Fill in the password field
   * @param password - The password to set for the new account
   */
  async fillPassword(password: string) {
    await this.form.fillField({
      fieldName: "password",
      fieldType: BaseField.PASSWORD,
      value: password,
    });

    await this.form.fillField({
      fieldName: "passwordConfirmation",
      fieldType: BaseField.PASSWORD,
      value: password,
    });
  }

  /**
   * Submit the accept invitation form
   */
  async submitAcceptInvitationForm() {
    await this.clickByTestId(dataTestIds.acceptInvitation.submitButton);
  }

  /**
   * Complete the full invitation acceptance flow
   * @param password - The password to set for the new account
   */
  async acceptInvitation(password: string) {
    // Wait for the page to load
    await this.page.waitForURL("**/einladung-annehmen**");

    // Click through the information panel
    await this.clickInformationButton();

    // Wait for the form to appear
    await this.page.waitForSelector(
      `[data-testid="${dataTestIds.acceptInvitation.submitButton}"]`,
    );

    // Fill in the password
    await this.fillPassword(password);

    // Submit the form
    await this.submitAcceptInvitationForm();
  }

  /**
   * Check if the invitation was accepted successfully
   */
  async isInvitationAccepted(): Promise<boolean> {
    try {
      // Wait for redirect after successful acceptance
      // You might need to adjust this based on where users are redirected after accepting
      await this.page.waitForURL("**/anmelden**", { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if the token expired banner is visible
   */
  async isTokenExpiredBannerVisible(): Promise<boolean> {
    // Adjust selector based on actual implementation
    const banner = this.page.locator('text="Einladungslink abgelaufen"');
    return await banner.isVisible();
  }

  /**
   * Get the user's name displayed in the invitation preview
   */
  async getInvitationPreviewName(): Promise<string | null> {
    try {
      // This might need adjustment based on how the name is displayed
      const nameElement = this.page.locator(
        '[data-testid="invitation-preview-name"]',
      );
      return await nameElement.textContent();
    } catch {
      return null;
    }
  }
}
