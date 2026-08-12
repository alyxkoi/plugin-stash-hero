import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
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
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      // Downloads must NEVER buffer file bytes — see src/lib/download.ts.
      // Any of these APIs caps downloads at 2 GB and has broken this app before.
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name='createObjectURL']",
          message:
            "URL.createObjectURL buffers bytes in memory and breaks downloads over 2GB. Use downloadPlugin() from @/lib/download (plain navigation).",
        },
        {
          selector: "CallExpression > MemberExpression[property.name='blob']",
          message:
            "response.blob() buffers the whole file (2GB cap). Never read a file response body — navigate to the URL instead (see @/lib/download).",
        },
        {
          selector: "CallExpression > MemberExpression[property.name='arrayBuffer']",
          message:
            "response.arrayBuffer() buffers the whole file (2GB cap). Never read a file response body — navigate to the URL instead (see @/lib/download).",
        },
        {
          selector: "NewExpression[callee.name='FileReader']",
          message:
            "FileReader buffers bytes in memory and breaks large downloads. See @/lib/download.",
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  eslintPluginPrettier,
);
