import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import stencil from '@stencil/eslint-plugin';
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "www/**",
      "coverage/**",
      "src/generated/**",
      "*.config.{js,mjs,cjs,ts,mts,cts}",
      "*.setup.{js,mjs,cjs,ts,mts,cts}"
    ],
  },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
  ...tseslint.configs.recommendedTypeChecked,
  {
    rules: {
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
    files: ["**/*.{ts,mts,cts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  stencil.configs.flat.base,
]);
