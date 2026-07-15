// Flat config (ESLint 9). Lints the TypeScript source with typescript-eslint's
// recommended rules. Type-aware linting is intentionally omitted to keep lint
// fast and decoupled from tsconfig; `tsc` (npm run build) is the type gate.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "coverage/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      // TypeScript's own checker (strict + noUnusedLocals) handles these; the
      // ESLint core `no-undef` misfires on TS type-space identifiers.
      "no-undef": "off",
    },
  },
);
