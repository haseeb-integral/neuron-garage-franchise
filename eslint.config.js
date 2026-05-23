import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // ─── Rule 12 guard (May 23, 2026) ──────────────────────────────────────
  // Any composite score displayed to a user must come from src/lib/marketView.ts.
  // Components must never read raw `.compositeScore` off market objects — that
  // is what caused the Honolulu 88-vs-23 drift. The selector is the only legal
  // path. Allowed surfaces: the selector itself, the store/data builders that
  // populate the raw field, and edge functions (server-side).
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/pages/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
    ],
    ignores: [
      "src/lib/marketView.ts",
      "src/lib/cityScoringLiveData.ts",
      "src/lib/cityScoringExport.ts",
      "src/lib/cityScoringPageHelpers.ts",
      "src/lib/clientSubWeightScoring.ts",
      "src/lib/clientSubWeightScoring.test.ts",
      "src/data/**",
      "src/stores/**",
      "src/integrations/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name='compositeScore']",
          message:
            "Rule 12: read composite via buildMarketView(market).composite / .compositeFormatted from @/lib/marketView. Never touch raw .compositeScore in UI code — see AGENTS.md Rule 12 and the May 23 2026 incident.",
        },
      ],
    },
  },
);
