import { defineConfig } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import js from "@eslint/js";
import globals from "globals";
import { resolve } from "node:path";
import "eslint-plugin-only-warn";

const project = resolve(process.cwd(), "tsconfig.json");

const eslintConfig = defineConfig([
  {
    ignores: [
      "node_modules/**",
      "style-system/**",
      ".next/**",
      ".*.js",
      "styled-system/**",
      "scripts/**",
      "eslint.config.mjs",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
        JSX: "readonly",
      },
    },
    settings: {},
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  prettierConfig,
]);

export default eslintConfig;
