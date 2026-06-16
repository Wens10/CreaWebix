import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        allowDefaultProject: true,
        // project: "./tsconfig.eslint.json"
      }
    },
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      ...eslintConfigPrettier.rules,
      "no-unused-vars": ["error", {
        "caughtErrors": "none"
      }],
      "prettier/prettier": "error"
    },
    ignores: [
      "eslint.config.mjs",
      "scripts/**",
      "deliverables/**",
      "node_modules/**"
    ]
  }
);