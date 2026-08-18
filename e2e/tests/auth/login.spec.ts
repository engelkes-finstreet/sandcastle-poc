import { test, expect } from "../../fixtures/fixtures";
import {
  clearAuthState,
  expectToBeOnPage,
  testCredentials,
} from "../../utils/test-helpers";
import { dataTestIds } from "../../data/dataTestIds";
import { routes } from "@/routes";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page, loginPage }) => {
    // Clear any existing auth state
    await clearAuthState(page);
    // Navigate to login page
    await loginPage.navigation.goto(routes.auth.login());
  });

  test("should display login form elements", async ({ page }) => {
    // Check that all form elements are present
    await expect(page.getByTestId("email-input")).toBeVisible();
    await expect(page.getByTestId("password-password")).toBeVisible();
    await expect(
      page.getByTestId(dataTestIds.buttons.submitButton),
    ).toBeVisible();
    await expect(
      page.getByTestId(dataTestIds.login.requestPasswordResetLink),
    ).toBeVisible();
  });

  test("should validate required fields", async ({ loginPage, page }) => {
    // Try to submit without filling any fields
    await loginPage.form.submit();

    // Wait a moment for validation to trigger
    await page.waitForTimeout(500);

    // Check for field-specific error messages
    const emailError = await loginPage.errors.getErrorMessage("email");
    const passwordError = await loginPage.errors.getErrorMessage("password");

    // Both fields should have error messages
    expect(emailError).toBeTruthy();
    expect(passwordError).toBeTruthy();

    // Check that we're still on login page
    await expect(page).toHaveURL(/.*\/anmelden/);
  });

  test("should navigate to password reset page", async ({
    loginPage,
    page,
  }) => {
    // Click on password reset link
    await loginPage.clickPasswordResetLink();

    // Verify navigation to password reset page
    await expectToBeOnPage(page, "/passwort-vergessen");
  });

  test("should handle session redirect when already logged in", async ({
    page,
    loginPage,
  }) => {
    // First, login with valid credentials
    await loginPage.loginAsCustomer(
      testCredentials.customerEmail,
      testCredentials.customerPassword,
    );

    // Now try to access login page again
    await loginPage.navigation.goto("/anmelden");

    // Should be redirected away from login page
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/anmelden");
  });

  test("should navigate fsp admins to the correct page after login", async ({
    loginPage,
  }) => {
    await loginPage.loginAsFspAdmin(
      testCredentials.fspAdminEmail,
      testCredentials.fspAdminPassword,
    );
  });

  test("should navigate property managers to the correct page after login", async ({
    loginPage,
  }) => {
    await loginPage.loginAsCustomer(
      testCredentials.customerEmail,
      testCredentials.customerPassword,
    );
  });
});
