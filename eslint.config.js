import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "build/",
      ".react-router/",
      "node_modules/",
      "coverage/",
      "playwright-report/",
      "test-results/",
      "supabase/.temp/",
      ".superpowers/",
      ".claude/",
      "docs/",
      "src/types/database.ts",
    ],
  },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { console: "readonly", process: "readonly" } },
  },
  jsxA11y.flatConfigs.recommended,
  reactHooks.configs.flat.recommended,
);
