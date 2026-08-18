import { Page } from "@playwright/test";
import { BaseHelper } from "./BaseHelper";
import { dataTestIds } from "e2e/data/dataTestIds";

export class NavigationHelper extends BaseHelper {
  constructor(page: Page) {
    super(page);
  }

  async goto(path: string) {
    await this.page.goto(path);
  }

  async reload() {
    await this.page.reload();
    await this.waitForNavigation();
  }

  async waitForNavigation() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Waits for the page to navigate to the given URL
   * @param url
   * @param timeout
   */
  async waitForUrl(url: string, timeout?: number) {
    await this.page.waitForURL(
      (currentUrl) => {
        return currentUrl.pathname.includes(url);
      },
      { timeout },
    );
  }

  /**
   * Waits for the page to redirect from the given path
   * @param fromPath
   * @param timeout
   */
  async waitForRedirect(fromPath: string, timeout: number = 10000) {
    await this.page.waitForURL(
      (currentUrl) => !currentUrl.pathname.includes(fromPath),
      { timeout },
    );
  }

  async clickBackButton(nextUrl: string) {
    await this.clickByTestId(dataTestIds.buttons.backButton);
    await this.waitForUrl(nextUrl);
  }

  async navigateToSection(testId: string, route: string): Promise<void> {
    await this.clickByTestId(testId);
    await this.waitForUrl(route);
    await this.waitForNavigation();
  }
}
