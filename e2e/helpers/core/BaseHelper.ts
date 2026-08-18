import { Page } from "@playwright/test";

export class BaseHelper {
  constructor(protected page: Page) {}

  getPage(): Page {
    return this.page;
  }

  async clickByTestId(testId: string) {
    await this.page.click(`[data-testid="${testId}"]`);
  }

  getLocatorByTestId(testId: string) {
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  async waitForSelectorByTestId(selector: string) {
    await this.page.waitForSelector(selector, {
      state: "visible",
      timeout: 10000,
    });
  }

  async getTextByTestId(testId: string) {
    return await this.page.textContent(`[data-testid="${testId}"]`);
  }

  getDataTestId(testId: string) {
    return `[data-testid="${testId}"]`;
  }
}
