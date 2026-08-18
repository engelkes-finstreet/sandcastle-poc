import { Page, expect, Locator } from "@playwright/test";
import { BaseHelper } from "../core/BaseHelper";
import { dataTestIds } from "e2e/data/dataTestIds";

/**
 * Helper class for interacting with card-based UI components
 * Provides reusable methods for card interactions like viewing, updating, and deleting
 * Uses unified menu test IDs from dataTestIds.menu
 */
export class CardHelper extends BaseHelper {
  constructor(
    page: Page,
    private cardTestId: string,
  ) {
    super(page);
  }

  /**
   * Gets a card locator by index
   * @param cardIndex - The index of the card (default: 0)
   * @returns Locator for the card at the specified index
   */
  getCard(cardIndex: number = 0): Locator {
    const cards = this.getLocatorByTestId(this.cardTestId);
    return cards.nth(cardIndex);
  }

  /**
   * Verifies that a card does not exist or is not visible
   * @param cardIndex - The index of the card to verify (default: 0)
   */
  async verifyCardDoesNotExist(cardIndex: number = 0): Promise<void> {
    const card = this.getCard(cardIndex);
    await expect(card).not.toBeVisible();
  }

  /**
   * Verifies that a card's headline (h3) contains the expected text
   * @param cardIndex - The index of the card to verify
   * @param expectedText - The expected text in the headline
   */
  async verifyCardHeadline(
    cardIndex: number,
    expectedText: string,
  ): Promise<void> {
    const card = this.getCard(cardIndex);
    await expect(card).toBeVisible();

    const headline = card.locator("h3").first();
    await expect(headline).toContainText(expectedText);
  }

  /**
   * Opens the menu for a specific card
   * @param cardIndex - The index of the card (default: 0)
   */
  async openCardMenu(cardIndex: number = 0): Promise<void> {
    const card = this.getCard(cardIndex);
    const menuTrigger = card.locator(
      `[data-testid="${dataTestIds.menu.trigger}"]`,
    );
    await menuTrigger.click();
  }

  /**
   * Opens the menu and clicks the update menu item
   * @param cardIndex - The index of the card to update (default: 0)
   */
  async clickUpdateCard(cardIndex: number = 0): Promise<void> {
    await this.openCardMenu(cardIndex);
    await this.clickByTestId(dataTestIds.menu.update);
  }

  /**
   * Opens the menu, clicks delete, and confirms the deletion
   * @param cardIndex - The index of the card to delete (default: 0)
   */
  async deleteCard(cardIndex: number = 0): Promise<void> {
    await this.openCardMenu(cardIndex);
    await this.clickByTestId(dataTestIds.menu.delete);
    await this.clickByTestId(dataTestIds.buttons.submitButton);
  }
}
