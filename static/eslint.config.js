const {
  defineConfig,
  globalIgnores,
} = require("eslint/config");

const tsParser = require("@typescript-eslint/parser");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const js = require("@eslint/js");

const {
  FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

module.exports = defineConfig([{
  languageOptions: {
    parser: tsParser,

    parserOptions: {
      "project": "./tsconfig.json",
      "tsconfigRootDir": __dirname,
    },
  },

  plugins: {
    "@typescript-eslint": typescriptEslint,
  },

  extends: compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@stencil-community/recommended",
  ),

  "rules": {
    "no-empty-function": "off",
    "quotes": ["error", "single"],

    "react/jsx-no-bind": ["warn", {
      "ignoreRefs": true,
      "allowArrowFunctions": true,
    }],

    "@stencil-community/required-jsdoc": "off",
    "@typescript-eslint/no-empty-function": ["error"],

    "@typescript-eslint/no-unused-vars": ["error", {
      "varsIgnorePattern": "^h$",
    }],
  },
}, globalIgnores(["**/node_modules", "src/generated", "**/build"])]);
