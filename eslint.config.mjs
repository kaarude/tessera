import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored / generated
    "node_modules/**",
    "public/**",
    "scripts/**",
    "prisma/migrations/**",
  ]),
  {
    // New server-side code is held to a strict bar.
    files: [
      "app/api/**/*.{ts,tsx}",
      "lib/auth.ts",
      "lib/prisma.ts",
      "lib/permissions.ts",
      "lib/permissions-server.ts",
      "lib/route.ts",
      "lib/api-error.ts",
      "lib/audit.ts",
      "lib/rate-limit.ts",
      "lib/s3.ts",
      "lib/api.ts",
      "lib/types.ts",
      "lib/store.ts",
      "lib/utils.ts",
      "components/app-shell.tsx",
      "components/providers.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Legacy client pages and the topbar/sidebar still have many `any` casts
    // that are technically correct (they match the API's Prisma shapes) but
    // would be a huge refactor to fully type. We track them as warnings.
    files: [
      "app/**/page.tsx",
      "app/**/*/page.tsx",
      "components/sidebar.tsx",
      "components/topbar.tsx",
      "app/login/**",
      "app/settings/**",
      "app/error.tsx",
      "app/not-found.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
