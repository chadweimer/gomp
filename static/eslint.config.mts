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
    ],
  },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
  ...tseslint.configs.recommendedTypeChecked,
  {
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
