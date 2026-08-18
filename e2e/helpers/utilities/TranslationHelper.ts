import * as fs from 'fs';
import * as path from 'path';
import { expect, Page } from '@playwright/test';

/**
 * Helper class for handling translations in E2E tests
 * Loads translations from the messages files and provides methods to retrieve them
 */
export class TranslationHelper {
  private translations: Record<string, any>;
  private locale: string;
  private page?: Page;

  /**
   * Initialize the TranslationHelper with a specific locale and optional page
   * @param locale - The locale to load translations for (default: 'de')
   * @param page - Optional Playwright page object for verification methods
   */
  constructor(locale: string = 'de', page?: Page) {
    this.locale = locale;
    this.page = page;
    this.translations = this.loadTranslations();
  }

  /**
   * Load translations from the messages file
   * @returns The loaded translations object
   */
  private loadTranslations(): Record<string, any> {
    try {
      const messagesPath = path.join(process.cwd(), 'messages', `${this.locale}.json`);
      const fileContent = fs.readFileSync(messagesPath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error(`Failed to load translations for locale ${this.locale}:`, error);
      return {};
    }
  }

  /**
   * Get a translation by its key path using dot notation
   * @param keyPath - The dot-separated path to the translation (e.g., "auth.login.fields.email.label")
   * @param defaultValue - Optional default value if translation is not found
   * @returns The translated string or the default value
   */
  getTranslation(keyPath: string, defaultValue?: string): string {
    const keys = keyPath.split('.');
    let current = this.translations;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        console.warn(`Translation not found for key: ${keyPath}`);
        return defaultValue || keyPath;
      }
    }

    if (typeof current === 'string') {
      return current;
    }

    console.warn(`Translation value is not a string for key: ${keyPath}`);
    return defaultValue || keyPath;
  }

  /**
   * Get a translation using an array of keys
   * @param keys - Array of keys representing the path to the translation
   * @param defaultValue - Optional default value if translation is not found
   * @returns The translated string or the default value
   */
  getNestedTranslation(keys: string[], defaultValue?: string): string {
    return this.getTranslation(keys.join('.'), defaultValue);
  }

  /**
   * Check if a translation exists for a given key path
   * @param keyPath - The dot-separated path to the translation
   * @returns True if the translation exists, false otherwise
   */
  hasTranslation(keyPath: string): boolean {
    const keys = keyPath.split('.');
    let current = this.translations;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return false;
      }
    }

    return typeof current === 'string';
  }

  /**
   * Get all translations for a specific section
   * @param sectionPath - The dot-separated path to the section (e.g., "auth.login")
   * @returns An object containing all translations in that section
   */
  getSection(sectionPath: string): Record<string, any> {
    const keys = sectionPath.split('.');
    let current = this.translations;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        console.warn(`Section not found: ${sectionPath}`);
        return {};
      }
    }

    return typeof current === 'object' ? current : {};
  }

  /**
   * Format a translation with dynamic values
   * @param keyPath - The dot-separated path to the translation
   * @param values - Object containing values to interpolate
   * @returns The formatted string with interpolated values
   */
  formatTranslation(keyPath: string, values: Record<string, string | number>): string {
    let translation = this.getTranslation(keyPath);
    
    // Replace {key} placeholders with values
    Object.entries(values).forEach(([key, value]) => {
      translation = translation.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    });

    return translation;
  }

  /**
   * Verify that a translated text is visible on the page
   * @param translationKey - The dot-separated path to the translation
   * @param page - Optional page object (uses instance page if not provided)
   * @returns Promise that resolves when the text is verified as visible
   */
  async verifyTranslatedText(translationKey: string, page?: Page): Promise<void> {
    const pageToUse = page || this.page;
    if (!pageToUse) {
      throw new Error('Page object must be provided either in constructor or as parameter');
    }
    const text = this.getTranslation(translationKey);
    await expect(pageToUse.getByText(text, { exact: true })).toBeVisible();
  }

  /**
   * Get the current locale
   * @returns The current locale string
   */
  getLocale(): string {
    return this.locale;
  }

  /**
   * Reload translations (useful if translations file changes during tests)
   */
  reload(): void {
    this.translations = this.loadTranslations();
  }
}

// Singleton instance for convenience
let defaultInstance: TranslationHelper | null = null;

/**
 * Get the default TranslationHelper instance (singleton)
 * @param locale - The locale to use (only used on first call)
 * @returns The TranslationHelper instance
 */
export function getTranslations(locale: string = 'de'): TranslationHelper {
  if (!defaultInstance) {
    defaultInstance = new TranslationHelper(locale);
  }
  return defaultInstance;
}

/**
 * Quick helper function to get a translation without creating an instance
 * @param keyPath - The dot-separated path to the translation
 * @param locale - The locale to use (default: 'de')
 * @returns The translated string
 */
export function t(keyPath: string, locale: string = 'de'): string {
  return getTranslations(locale).getTranslation(keyPath);
}