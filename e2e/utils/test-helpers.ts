import { Page } from "@playwright/test";

export const testCredentials = {
  customerEmail:
    process.env.E2E_TEST_PROPERTY_MANAGER_EMAIL || "customer@example.com",
  customerPassword:
    process.env.E2E_TEST_PROPERTY_MANAGER_PASSWORD || "password123",
  fspEmail: process.env.E2E_TEST_FSP_EMAIL || "fsp@example.com",
  fspPassword: process.env.E2E_TEST_FSP_PASSWORD || "password123",
  fspAdminEmail:
    process.env.E2E_TEST_FSP_ADMIN_EMAIL || "fsp-admin@example.com",
  fspAdminPassword: process.env.E2E_TEST_FSP_ADMIN_PASSWORD || "password123",
  fspMasterData1Email:
    process.env.E2E_TEST_FSP_MASTER_DATA1_EMAIL ||
    "fsp-master-data-1@example.com",
  fspMasterData1Password:
    process.env.E2E_TEST_FSP_MASTER_DATA1_PASSWORD || "password123",
  fspMasterData2Email:
    process.env.E2E_TEST_FSP_MASTER_DATA2_EMAIL ||
    "fsp-master-data-2@example.com",
  fspMasterData2Password:
    process.env.E2E_TEST_FSP_MASTER_DATA2_PASSWORD || "password123",
};

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
}

export async function clearAuthState(page: Page) {
  // Clear cookies and local storage
  await page.context().clearCookies();
}

export async function expectToBeOnPage(page: Page, path: string) {
  await page.waitForURL(`**${path}**`);
  const url = page.url();
  return url.includes(path);
}
