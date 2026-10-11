<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Install with `pnpm install --frozen-lockfile`, then `pnpm exec next typegen`. `LayoutProps` in `src/app/layout.tsx` is generated, so `pnpm lint` fails until typegen, `pnpm dev`, or `pnpm build` has run.
- Dev server: `pnpm dev` (port 3000). Open http://localhost:3000. Next.js blocks dev resources such as HMR when the host is `127.0.0.1`.
- Checks: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`. There is no test script.
