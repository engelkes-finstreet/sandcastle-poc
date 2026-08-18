---
name: e2e-agent
description: ALWAYS use this agent if the user mentions anything about e2e tests
tools: Bash, Glob, Grep, LS, ExitPlanMode, Read, Edit, MultiEdit, Write, NotebookRead, NotebookEdit, WebFetch, TodoWrite, WebSearch, ListMcpResourcesTool, ReadMcpResourceTool
color: yellow
---

# End-to-End Testing with Playwright

This document provides a comprehensive guide to the E2E testing architecture implemented in this project using Playwright.

## Overview

The E2E testing framework is built on Playwright with a custom architecture that emphasizes:

- **Composition over inheritance** through helper classes
- **Page Object Model (POM)** for maintainability
- **Reusable test fixtures** for common functionality
- **Separation of concerns** between test logic and page interactions

## Architecture Concepts

### 1. Base Page Pattern

The foundation of our E2E tests is the `BasePage` class (`e2e/pages/BasePage.ts`), which implements a composition pattern rather than traditional inheritance. This approach provides:

- **Modular functionality** through specialized helper classes
- **Clear separation of concerns**
- **Easy extensibility** without deep inheritance chains

#### Composition Components

The `BasePage` integrates three key helper classes:

1. **FieldInteractor** - Handles all form field interactions
2. **ErrorHandler** - Manages error detection and retrieval
3. **NavigationHelper** - Controls page navigation and waits

```typescript
export class BasePage {
  readonly page: Page;
  readonly fields: FieldInteractor;
  readonly errors: ErrorHandler;
  readonly navigation: NavigationHelper;
}
```

### 2. Helper Classes

#### FieldInteractor (`e2e/helpers/FieldInteractor.ts`)

Provides a unified interface for interacting with form fields, supporting multiple field types from the `@finstreet/forms` library:

- **Purpose**: Abstract away the complexity of different form field types
- **Key Features**:
  - Type-safe field interactions using `BaseField` enum
  - Consistent API for all field types (input, textarea, checkbox, radio, select, etc.)
  - Both read and write operations for form values

#### ErrorHandler (`e2e/helpers/ErrorHandler.ts`)

Centralizes error detection and message retrieval:

- **Purpose**: Provide reliable error handling across all tests
- **Key Features**:
  - Field-specific error detection
  - Form-level error detection
  - Waiting for errors to appear
  - Checking error visibility

#### NavigationHelper (`e2e/helpers/NavigationHelper.ts`)

Manages all navigation-related operations:

- **Purpose**: Simplify page navigation and state management
- **Key Features**:
  - Page navigation and redirects
  - Wait strategies for different load states
  - URL and title assertions
  - Screenshot capabilities

### 3. Page-Specific Fixtures

Page-specific classes extend `BasePage` to provide domain-specific functionality. For example, `LoginPage` (`e2e/pages/LoginPage.ts`) adds:

- Login-specific methods (fillEmail, fillPassword, login)
- Page-specific element interactions
- Business logic encapsulation

### 4. Test Data Organization

- **Data Test IDs**: Centralized in `e2e/data/dataTestIds.ts` for consistent element selection
- **Test Credentials**: Managed through `e2e/utils/test-helpers.ts`

## Testing Patterns

### 1. Test Structure

Tests follow a consistent pattern:

```typescript
test.describe("Feature Name", () => {
  test.beforeEach(async ({ page, customFixture }) => {
    // Setup and navigation
  });

  test("should perform specific action", async ({ customFixture }) => {
    // Arrange
    // Act
    // Assert
  });
});
```

### 2. Page Object Usage

Page objects encapsulate page-specific logic:

```typescript
// Instead of direct page interactions
await page.fill('[data-testid="email-input"]', "user@example.com");

// Use page object methods
await loginPage.fillEmail("user@example.com");
```

### 3. Error Handling

The framework provides multiple ways to handle errors:

```typescript
// Check for field-specific errors
const emailError = await loginPage.errors.getErrorMessage("email");

// Wait for errors to appear
await loginPage.errors.waitForError("password");

// Check error visibility
const hasError = await loginPage.errors.hasFieldError("email");
```

### 4. Navigation and Waits

The framework handles various waiting scenarios:

```typescript
// Wait for navigation
await loginPage.navigation.waitForRedirect("/anmelden");

// Wait for specific elements
await loginPage.navigation.waitForTestId("submit-button");

// Check current page
const isOnLoginPage = await loginPage.navigation.isOnPage("/anmelden");
```

## Best Practices

### 1. Use Composition Helpers

Always use the provided helper methods instead of direct Playwright API calls:

```typescript
// L Don't do this
await page.fill('[data-testid="email-input"]', value);

//  Do this
await loginPage.fields.fillFormField({
  fieldName: "email",
  fieldType: BaseField.INPUT,
  value: email,
});
```

### 2. Leverage Type Safety

Use the `BaseField` enum for field type safety:

```typescript
import { BaseField } from "@finstreet/forms";

await page.fields.fillFormField({
  fieldName: "acceptTerms",
  fieldType: BaseField.CHECKBOX,
  value: true,
});
```

### 3. Consistent Test Data

Use centralized test IDs and test data:

```typescript
import { dataTestIds } from "../data/dataTestIds";
import { testCredentials } from "../utils/test-helpers";

await loginPage.clickByTestId(dataTestIds.login.loginButton);
```

### 4. Clear Test Organization

- Group related tests using `test.describe`
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Clean up state in `beforeEach` hooks

### 5. Error Assertions

Always verify both positive and negative scenarios:

```typescript
// Positive case
await loginPage.login(validEmail, validPassword);
expect(await loginPage.isLoggedIn()).toBeTruthy();

// Negative case
await loginPage.clickSubmit();
expect(await loginPage.errors.getErrorMessage("email")).toBeTruthy();
```

## Extending the Framework

### Adding New Page Objects

1. Create a new page class extending `BasePage`
2. Add page-specific methods
3. Export from a fixture file

```typescript
export class NewFeaturePage extends BasePage {
  async performSpecificAction() {
    // Implementation using composition helpers
  }
}
```

### Adding New Helper Classes

1. Create a new helper class following the existing pattern
2. Integrate into `BasePage` or specific page objects
3. Ensure consistent API design

## Running Tests

Refer to the [commands documentation](../commands.md) for specific commands to run E2E tests.

## Debugging

The framework provides several debugging aids:

- Screenshot capability: `await page.navigation.takeScreenshot("debug-state")`
- Detailed error messages through `ErrorHandler`
- Network idle waiting for stable page states
