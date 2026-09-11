import js from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import configPrettier from "eslint-config-prettier";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import pluginImportX from "eslint-plugin-import-x";
import pluginJsonc from "eslint-plugin-jsonc";
import globals from "globals";
import * as jsoncParser from "jsonc-eslint-parser";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["build/**", "coverage/**", "dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintReact.configs.recommended,

  {
    languageOptions: { ecmaVersion: "latest" },
    settings: {
      "import-x/resolver-next": [
        createTypeScriptImportResolver({
          noWarnOnMultipleProjects: true,
          project: [
            "./tsconfig.client.json",
            "./tsconfig.server.json",
            "./tsconfig.tooling.json",
          ],
        }),
      ],
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "import-x": pluginImportX },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "off",
      "padding-line-between-statements": "off",
      "sort-imports": "off",
      "import-x/order": "off",
      "no-unused-vars": "off",
      "no-constant-condition": "error",
      "no-unreachable": "error",
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "src/**/*.mock.{ts,tsx}",
            "src/**/*.test.{ts,tsx}",
            "src/client/setupTests.ts",
            "src/client/test-utils/**/*.{ts,tsx}",
            "*.config.ts",
          ],
        },
      ],
      "@eslint-react/no-array-index-key": "off",
      "@eslint-react/no-children-to-array": "off",
      "@eslint-react/no-nested-component-definitions": "off",
      "@eslint-react/no-set-state-in-component-did-mount": "off",
    },
  },

  {
    files: ["src/client/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      "import-x/extensions": [
        "error",
        "ignorePackages",
        { js: "never", jsx: "never", ts: "never", tsx: "never" },
      ],
    },
  },

  {
    files: ["src/server/**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "import-x/extensions": [
        "error",
        "ignorePackages",
        { js: "always", jsx: "never", ts: "never", tsx: "never" },
      ],
    },
  },

  ...pluginJsonc.configs["flat/recommended-with-jsonc"],

  {
    files: ["**/*.json", "**/*.jsonc"],
    languageOptions: { parser: jsoncParser },
    rules: {
      "jsonc/sort-keys": "off",
    },
  },

  {
    files: ["package.json"],
    rules: {
      "jsonc/sort-keys": "off",
    },
  },

  configPrettier,
);
