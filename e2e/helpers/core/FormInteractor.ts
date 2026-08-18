import { Page } from "@playwright/test";
import { BaseField } from "@finstreet/forms";
import { BaseHelper } from "./BaseHelper";
import { dataTestIds } from "e2e/data/dataTestIds";

export interface FieldInteractionOptions {
  fieldName: string;
  fieldType: BaseField;
  value?: string | boolean | number | unknown;
  clickFirstItem?: boolean; // Only for comboboxes, determines whether to click the first item in the dropdown
}

export class FormInteractor extends BaseHelper {
  constructor(page: Page) {
    super(page);
  }

  private async fillByTestId(testId: string, value: string) {
    await this.page.fill(`[data-testid="${testId}"]`, value);
  }

  private async checkByTestId(testId: string) {
    await this.page.click(`[data-testid="${testId}"]`, {
      position: { x: 2, y: 2 },
    });
  }

  private async uncheckByTestId(testId: string) {
    await this.page.click(`[data-testid="${testId}"]`, {
      position: { x: 2, y: 2 },
    });
  }

  private async fillInput(testId: string, value: string) {
    await this.fillByTestId(`${testId}-input`, value);
  }

  private async fillPassword(testId: string, value: string) {
    await this.fillByTestId(`${testId}-password`, value);
  }

  private async fillNumber(testId: string, value: number) {
    await this.fillByTestId(`${testId}-number`, value.toString());
  }

  private async fillTextarea(testId: string, value: string) {
    await this.fillByTestId(`${testId}-textarea`, value);
  }

  private async checkCheckbox(testId: string) {
    await this.checkByTestId(`${testId}-checkbox`);
  }

  private async uncheckCheckbox(testId: string) {
    await this.uncheckByTestId(`${testId}-checkbox`);
  }

  private async selectRadioOption(fieldName: string, option: "yes" | "no") {
    const testId = `${fieldName}-yes-no-radio-group__item-${option}`;
    await this.clickByTestId(testId);
  }

  private async selectRadioGroupOption(fieldName: string, value: string) {
    const testId = `${fieldName}-radio-group__item-${value}`;
    await this.clickByTestId(testId);
  }

  private async selectComboboxOption(
    fieldName: string,
    value: string,
    clickFirstItem = false,
  ) {
    const clearButton = this.page.getByTestId(
      `${fieldName}-combobox__input__clearButton`,
    );
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }

    await this.fillByTestId(`${fieldName}-combobox__input`, value);

    // Wait for 5 seconds
    await this.page.waitForTimeout(5000);

    // Click the second item in the combobox dropdown
    if (clickFirstItem) {
      await this.clickByTestId(`${fieldName}-combobox__item-0`);
    } else {
      await this.clickByTestId(`${fieldName}-combobox__item-1`);
    }
  }

  private async selectOption(testId: string, value: string) {
    // Click the trigger button to open the dropdown
    await this.clickByTestId(`${testId}-select__trigger`);

    // Wait for the dropdown content to be visible
    await this.page.waitForSelector(
      `[data-testid="${testId}-select__content"]`,
      { state: "visible" },
    );

    // Click the option with the matching value
    await this.clickByTestId(`${testId}-select__item-${value}`);
  }

  async selectVisibleOption(testId: string, value: string) {
    await this.page.click(`[data-testid="${testId}__trigger"]:visible`);

    await this.page.waitForSelector(
      `[data-testid="${testId}__content"]:visible`,
      {
        state: "visible",
      },
    );

    await this.page.click(`[data-testid="${testId}__item-${value}"]:visible`);
  }

  async selectFirstOption(testId: string) {
    // Click the trigger button to open the dropdown
    await this.clickByTestId(`${testId}-select__trigger`);

    // Wait for the dropdown content to be visible
    await this.page.waitForSelector(
      `[data-testid="${testId}-select__content"]`,
      { state: "visible" },
    );

    // Click the first option in the dropdown
    const firstOption = this.page
      .locator(`[data-testid^="${testId}-select__item-"]`)
      .first();
    await firstOption.click();
  }

  private async fillDatepicker(testId: string, value: string) {
    await this.fillByTestId(`${testId}-datepicker`, value);
  }

  private async selectSelectableCards(testId: string, values: string[]) {
    for (const value of values) {
      await this.clickByTestId(`${testId}-selectable-cards__card-${value}`);
      // Wait a bit for the selection to register
      await this.page.waitForTimeout(200);
    }
  }

  private async uploadFile(testId: string, filePath: string) {
    await this.page.setInputFiles(
      `[data-testid="${testId}-file-upload"]`,
      filePath,
    );
  }

  async submit() {
    await this.clickByTestId(dataTestIds.buttons.submitButton);
  }

  async fillField(options: FieldInteractionOptions) {
    const { fieldName, fieldType, value, clickFirstItem } = options;

    switch (fieldType) {
      case BaseField.INPUT:
        await this.fillInput(fieldName, value as string);
        break;

      case BaseField.NUMBER:
        await this.fillNumber(fieldName, value as number);
        break;

      case BaseField.TEXTAREA:
        await this.fillTextarea(fieldName, value as string);
        break;

      case BaseField.PASSWORD:
        await this.fillPassword(fieldName, value as string);
        break;

      case BaseField.CHECKBOX:
        if (value === true) {
          await this.checkCheckbox(fieldName);
        } else if (value === false) {
          await this.uncheckCheckbox(fieldName);
        }
        break;

      case BaseField.YES_NO_RADIO_GROUP:
        if (value === "yes" || value === "no") {
          await this.selectRadioOption(fieldName, value);
        }
        break;

      case BaseField.RADIO_GROUP:
        await this.selectRadioGroupOption(fieldName, value as string);
        break;

      case BaseField.SELECT:
        await this.selectOption(fieldName, value as string);
        break;

      case BaseField.COMBOBOX:
        await this.selectComboboxOption(
          fieldName,
          value as string,
          clickFirstItem,
        );
        break;

      case BaseField.DATEPICKER:
        await this.fillDatepicker(fieldName, value as string);
        break;

      case BaseField.SELECTABLE_CARDS:
        await this.selectSelectableCards(fieldName, value as string[]);
        break;

      case BaseField.FILE_UPLOAD:
        await this.uploadFile(fieldName, value as string);
        break;

      default:
        throw new Error(`Unsupported field type: ${fieldType}`);
    }
  }
}
