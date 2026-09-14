const plugin = require("@typescript-eslint/eslint-plugin");
const parser = require("@typescript-eslint/parser");

/** @type {import("@typescript-eslint/eslint-plugin").Linter.Config[]} */
module.exports = [
  {
    ignores: ["out", "dist", "**/*.d.ts"]
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": plugin
    },
    rules: {
      "@typescript-eslint/naming-convention": "warn",
      "semi": "warn",
      "curly": "warn",
      "eqeqeq": "warn",
      "no-throw-literal": "warn",
      "no-unused-expressions": "warn",
      "sort-imports": ["warn", {
        "ignoreDeclarationSort": true
      }]
    }
  }
];
