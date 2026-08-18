import { Page, Locator } from "@playwright/test";
import { BaseHelper } from "../core/BaseHelper";
import { NavigationHelper } from "../core/NavigationHelper";

const GROUP_SUFFIX = "__group";

/**
 * Helper class for interacting with InteractiveLists in E2E tests.
 * Provides unified methods for list operations across different page objects.
 */
export class InteractiveListHelper extends BaseHelper {
  rootTestId: string;
  navigation: NavigationHelper;

  constructor(page: Page, rootTestId: string) {
    super(page);
    this.rootTestId = rootTestId;
    this.navigation = new NavigationHelper(page);
  }

  /**
   * Gets the list group container
   */
  getListGroup(): Locator {
    return this.getLocatorByTestId(`${this.rootTestId}${GROUP_SUFFIX}`);
  }

  /**
   * Gets the main list container
   */
  getListContainer(): Locator {
    return this.getLocatorByTestId(this.rootTestId);
  }

  /**
   * Gets a list item by its index
   * @param index - The index of the item (0-based)
   */
  getListItemByIndex(index: number): Locator {
    const listContainer = this.getListContainer();
    return listContainer.locator("li").nth(index);
  }

  /**
   * Gets the first item in the list
   */
  getFirstListItem(): Locator {
    const listContainer = this.getListContainer();
    return listContainer.locator("li").first();
  }

  /**
   * Gets the last item in the list
   */
  getLastListItem(): Locator {
    const listContainer = this.getListContainer();
    return listContainer.locator("li").last();
  }

  /**
   * Gets a list item by its specific test ID
   * @param testId - The complete test ID of the item
   */
  getListItemByTestId(testId: string): Locator {
    return this.getLocatorByTestId(testId);
  }

  /**
   * Extracts an ID from a list item's data-testid attribute
   * @param item - The list item locator
   * @param pattern - Optional regex pattern to extract the ID (default: /__item-(.+)$/)
   */
  async extractIdFromListItem(
    item: Locator,
    pattern: RegExp = /__item-(.+)$/,
  ): Promise<string | null> {
    try {
      const dataTestId = await item.getAttribute("data-testid");

      if (!dataTestId) {
        console.log("No data-testid attribute found on the list item");
        return null;
      }

      const match = dataTestId.match(pattern);

      if (!match || !match[1]) {
        console.log(`Could not extract ID from data-testid: ${dataTestId}`);
        return null;
      }

      return match[1];
    } catch (error) {
      console.error("Error extracting ID from list item:", error);
      return null;
    }
  }

  async getIdFromNthListItem(index: number): Promise<string | null> {
    await this.waitForListToLoad();
    const listItem = this.getListItemByIndex(index);
    const itemCount = await listItem.count();
    if (itemCount === 0) {
      console.log("No list item found at index:", index);
      return null;
    }

    return this.extractIdFromListItem(listItem);
  }

  async getIdFromFirstListItem(): Promise<string | null> {
    return this.getIdFromNthListItem(0);
  }

  async clickNthListItem(index: number, redirectRoute: string): Promise<void> {
    const listItem = this.getListItemByIndex(index);
    await listItem.click();
    await this.navigation.waitForUrl(redirectRoute);
  }

  async clickFirstListItem(redirectRoute: string): Promise<void> {
    await this.clickNthListItem(0, redirectRoute);
  }

  /**
   * Waits for the list to be loaded and visible
   * @param options - Optional wait options
   */
  async waitForListToLoad(
    options: { waitForItems?: boolean } = {},
  ): Promise<void> {
    const { waitForItems = true } = options;

    // Wait for the list container to be visible
    const listContainer = this.getListContainer();
    await listContainer.waitFor({ state: "visible", timeout: 10000 });

    // Optionally wait for at least one item to be present
    if (waitForItems) {
      const datTestId = this.getDataTestId(this.rootTestId);
      await this.waitForSelectorByTestId(`${datTestId} li`);
    }
  }
}
