module.exports = {
  root: true,
  env: {
    browser: true,
    jest: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "script",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  ignorePatterns: ["coverage/**", "lib/**", "node_modules/**"],
  overrides: [
    {
      files: ["src/**/*.ts"],
      rules: {
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-empty-interface": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-inferrable-types": "off",
        "@typescript-eslint/no-unused-vars": "off",
      },
    },
    {
      files: ["src/**/*.js"],
      rules: {
        "no-unused-vars": "off",
      },
    },
    {
      files: ["src/utils/jest.ts"],
      rules: {
        "@typescript-eslint/no-this-alias": "off",
      },
    },
  ],
};
