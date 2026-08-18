import { Page } from "@playwright/test";
import { BaseHelper } from "./BaseHelper";

export class ErrorHandler extends BaseHelper {
  constructor(page: Page) {
    super(page);
  }

  async getFieldError(fieldName: string): Promise<string | null> {
    const errorTestId = `${fieldName}-error`;
    try {
      await this.page.waitForSelector(`[data-testid="${errorTestId}"]`, {
        timeout: 5000,
      });
      return await this.page.textContent(`[data-testid="${errorTestId}"]`);
    } catch {
      return null;
    }
  }

  async getFormError(): Promise<string | null> {
    const formErrorTestId = "form-error";
    try {
      await this.page.waitForSelector(`[data-testid="${formErrorTestId}"]`, {
        timeout: 5000,
      });
      return await this.page.textContent(`[data-testid="${formErrorTestId}"]`);
    } catch {
      return null;
    }
  }

  async getErrorMessage(fieldName?: string): Promise<string | null> {
    if (fieldName) {
      return await this.getFieldError(fieldName);
    }
    return await this.getFormError();
  }
}
