import { Page } from "@playwright/test";
import { FormInteractor } from "e2e/helpers/core/FormInteractor";
import { ErrorHandler } from "e2e/helpers/core/ErrorHandler";
import { NavigationHelper } from "e2e/helpers/core/NavigationHelper";
import { BaseHelper } from "e2e/helpers/core/BaseHelper";

export class BasePage extends BaseHelper {
  readonly form: FormInteractor;
  readonly errors: ErrorHandler;
  readonly navigation: NavigationHelper;

  constructor(page: Page) {
    super(page);
    this.form = new FormInteractor(page);
    this.errors = new ErrorHandler(page);
    this.navigation = new NavigationHelper(page);
  }
}
