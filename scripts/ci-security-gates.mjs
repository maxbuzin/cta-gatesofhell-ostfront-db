import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { basename, join, extname } from "node:path";

const mode = process.argv[2] || "prebuild";

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") {
      continue;
    }
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

const TEXT_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".mdc",
  ".css",
  ".sql",
  ".toml",
  ".txt",
]);

const AGENT_INSTRUCTION_NAMES = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  ".cursorrules",
  ".cursorignore",
]);

function trackedTextFiles() {
  const out = execSync("git ls-files", { encoding: "utf8" });
  return out
    .split("\n")
    .filter(Boolean)
    .filter((f) => {
      const base = basename(f);
      if (AGENT_INSTRUCTION_NAMES.has(base)) return true;
      if (f === ".cursorrules" || f.endsWith("/.cursorrules")) return true;
      if (f.startsWith(".cursor/") || f.includes("/.cursor/")) return true;
      return TEXT_EXTS.has(extname(f));
    });
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const BANNED_EXACT = new Set([
  "ai",
  "openai",
  "anthropic",
  "langchain",
  "cohere-ai",
  "ollama",
]);
const BANNED_PREFIXES = [
  "@ai-sdk/",
  "@anthropic-ai/",
  "@langchain/",
  "@google/genai",
  "@google/generative-ai",
  "@mistralai/",
  "@huggingface/",
];

function isBannedPkg(name) {
  if (BANNED_EXACT.has(name)) return true;
  return BANNED_PREFIXES.some(
    (p) => name === p.replace(/\/$/, "") || name.startsWith(p),
  );
}

/** package.json dependency sections + pnpm-lock resolved package keys / importer names */
function scanAiPackages() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    for (const name of Object.keys(pkg[section] || {})) {
      if (isBannedPkg(name)) {
        fail(`AI SDK / LLM client dependency not allowed: ${name} (${section})`);
      }
    }
  }

  if (!existsSync("pnpm-lock.yaml")) return;
  const lock = readFileSync("pnpm-lock.yaml", "utf8");
  // Importer dependency keys: "      openai:" or "      '@ai-sdk/openai':"
  const importerKey =
    /^\s{4,8}['"]?(@?[\w.-]+(?:\/[\w.-]+)?)['"]?:\s*$/gm;
  // packages: entries "  openai@4.0.0:" or "  '@ai-sdk/openai@1.0.0':"
  const packagesKey =
    /^\s{2}['"]?(@?[^@'\s]+(?:\/[^@'\s]+)?)@[^'\s:]+['"]?:\s*$/gm;

  for (const re of [importerKey, packagesKey]) {
    let m;
    while ((m = re.exec(lock)) !== null) {
      const name = m[1];
      if (isBannedPkg(name)) {
        fail(
          `AI SDK / LLM client found in pnpm-lock.yaml (direct or transitive): ${name}`,
        );
      }
    }
  }
}

const LIFECYCLE_SCRIPTS = new Set([
  "preinstall",
  "install",
  "postinstall",
  "prepublish",
  "preprepare",
  "prepare",
  "postprepare",
  "prebuild",
  "build",
  "postbuild",
  "prestart",
  "start",
  "vercel-build",
  "predev",
  "dev",
  "postdev",
]);

/**
 * Owner migrate must never run from CI/Vercel/lifecycle scripts.
 * Case-insensitive; catches spacing/quoting variants of db:migrate,
 * drizzle-kit migrate/push, and DATABASE_URL_OWNER.
 */
const OWNER_MIGRATE_RE =
  /db\s*:\s*migrate|drizzle[\s_-]*kit[\s"'`]*[\s]+(?:migrate|push)|["'`]drizzle[\s_-]*kit["'`][\s]+(?:migrate|push)|DATABASE_URL_OWNER/i;

function hasOwnerMigrateReference(text) {
  return OWNER_MIGRATE_RE.test(String(text));
}

function scanMigrateOwnerGuard() {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const scripts = pkg.scripts || {};
  for (const [name, body] of Object.entries(scripts)) {
    if (!LIFECYCLE_SCRIPTS.has(name)) continue;
    if (hasOwnerMigrateReference(body)) {
      fail(
        `Forbidden owner-migrate reference in lifecycle script "${name}" (Max machine only)`,
      );
    }
  }

  if (existsSync("vercel.json")) {
    const vercel = readFileSync("vercel.json", "utf8");
    if (hasOwnerMigrateReference(vercel)) {
      fail(
        "Forbidden owner-migrate / DATABASE_URL_OWNER reference in vercel.json",
      );
    }
  }

  if (existsSync(".github/workflows")) {
    for (const f of walk(".github/workflows")) {
      if (!/\.(yml|yaml)$/.test(f)) continue;
      const content = readFileSync(f, "utf8");
      if (hasOwnerMigrateReference(content)) {
        fail(
          `Forbidden owner-migrate / DATABASE_URL_OWNER reference in ${f}`,
        );
      }
    }
  }
}

if (mode === "prebuild") {
  scanAiPackages();
  scanMigrateOwnerGuard();

  const nextPublicSecret =
    /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|DATABASE|PRIVATE|API_KEY)/i;
  for (const f of trackedTextFiles()) {
    if (f.includes("pnpm-lock.yaml") || f.includes("ci-security-gates")) {
      continue;
    }
    const content = readFileSync(f, "utf8");
    if (nextPublicSecret.test(content)) {
      fail(`Forbidden NEXT_PUBLIC secret-like name in ${f}`);
    }
  }

  // Bidirectional / zero-width / soft-hyphen / word-joiner / tag chars
  // Covers tracked text including AGENTS.md, .github, .cursor, .mdc, .cursorrules
  const hidden =
    /[\u00AD\u202A-\u202E\u2060-\u2064\u2066-\u2069\u200B-\u200F\uFEFF]|[\u{E0000}-\u{E007F}]/u;
  for (const f of trackedTextFiles()) {
    if (extname(f) === ".ico") continue;
    const content = readFileSync(f, "utf8");
    if (hidden.test(content)) {
      fail(`Hidden Unicode characters detected in ${f}`);
    }
  }
  console.log("Pre-build security gates passed");
}

if (mode === "postbuild") {
  const scanDir = ".next/static";
  if (!existsSync(scanDir)) {
    fail("Post-build secret scan requires .next/static (build output missing)");
  }
  const secretLike =
    /postgres:\/\/|neon\.tech|-pooler\.|Bearer [A-Za-z0-9._-]{16,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|npg_[A-Za-z0-9]+|REVALIDATE[_A-Z0-9]*=/;
  for (const f of walk(scanDir)) {
    if (statSync(f).size > 5_000_000) continue;
    let content;
    try {
      content = readFileSync(f, "utf8");
    } catch {
      continue;
    }
    if (secretLike.test(content)) {
      fail(`Possible secret material in ${f}`);
    }
  }
  console.log("Post-build secret scan passed");
}
