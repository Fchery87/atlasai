/* eslint-env node */
module.exports = {
  root: true,
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:react-hooks/recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  env: { browser: true, es2022: true, node: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  ignorePatterns: ["dist", "node_modules"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
};