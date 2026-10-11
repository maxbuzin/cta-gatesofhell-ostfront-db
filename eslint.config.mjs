import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**",
    "etl/**",
  ]),
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='sql'][callee.property.name='raw']",
          message: "sql.raw is banned (security-p0 #15).",
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            "dangerouslySetInnerHTML is banned except documented JSON-LD cases (security-p0 #15).",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "cn",
              message: "Use @/lib/utils cn() built from clsx + tailwind-merge.",
            },
            {
              name: "lucide",
              message: "Use lucide-react only.",
            },
            {
              name: "@phosphor-icons/react",
              message: "Use lucide-react only.",
            },
            {
              name: "ai",
              message: "AI SDK is not allowed in the app (security-p0 #20).",
            },
            {
              name: "@ai-sdk/openai",
              message: "AI SDK is not allowed in the app (security-p0 #20).",
            },
          ],
          patterns: [
            {
              group: ["@ai-sdk/*", "ai/*"],
              message: "AI SDK is not allowed in the app (security-p0 #20).",
            },
          ],
        },
      ],
    },
  },
  {
    // shadcn ChartStyle injects theme CSS variables (not user HTML)
    files: ["src/components/ui/chart.tsx"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
]);

export default eslintConfig;
