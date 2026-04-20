const js = require("@eslint/js");
const eslintConfigPrettier = require("eslint-config-prettier");
const globals = require("globals");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  {
    ignores: ["build/**", "coverage/**", "node_modules/**"],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "no-redeclare": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-redeclare": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  }
);
