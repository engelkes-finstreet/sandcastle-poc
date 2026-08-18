import { expect, Page } from "@playwright/test";

import { BaseField } from "@finstreet/forms";
import { BasePage } from "e2e/pages/BasePage";
import { dataTestIds } from "e2e/data/dataTestIds";
import { routes } from "@/routes";

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private async loginAndVerifyNavigation(
    email: string,
    password: string,
    expectedUrlPath: string,
  ) {
    if (!this.page.url().includes(routes.auth.login())) {
      await this.navigation.goto(routes.auth.login());
      await this.navigation.waitForUrl(routes.auth.login(), 10000);
    }

    await this.form.fillField({
      fieldName: "email",
      fieldType: BaseField.INPUT,
      value: email,
    });
    await this.form.fillField({
      fieldName: "password",
      fieldType: BaseField.PASSWORD,
      value: password,
    });
    await this.form.submit();

    await this.navigation.waitForRedirect(routes.auth.login());

    const currentUrl = this.page.url();
    expect(currentUrl).toContain(expectedUrlPath);
  }

  async loginAsCustomer(email: string, password: string) {
    await this.loginAndVerifyNavigation(
      email,
      password,
      routes.customer.financingCase.list(),
    );
  }

  async loginAsFspAdmin(email: string, password: string) {
    await this.loginAndVerifyNavigation(
      email,
      password,
      routes.admin.members.index,
    );
  }

  async loginAsFsp(email: string, password: string) {
    await this.loginAndVerifyNavigation(
      email,
      password,
      routes.fsp.financingCase.list(),
    );
  }

  async clickPasswordResetLink() {
    await this.clickByTestId(dataTestIds.login.requestPasswordResetLink);
  }
}
