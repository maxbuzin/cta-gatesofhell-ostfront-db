import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

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

function trackedTextFiles() {
  const out = execSync("git ls-files", { encoding: "utf8" });
  return out
    .split("\n")
    .filter(Boolean)
    .filter((f) =>
      [
        ".ts",
        ".tsx",
        ".js",
        ".mjs",
        ".cjs",
        ".json",
        ".yml",
        ".yaml",
        ".md",
        ".css",
        ".sql",
        ".toml",
        ".txt",
      ].includes(extname(f)),
    );
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const AI_PKG =
  /"(ai|openai|anthropic|langchain|cohere-ai|ollama)"|"@ai-sdk\/|"@anthropic-ai\/|"@langchain\/|"@google\/genai"|"@google\/generative-ai"|"@mistralai\/|"@huggingface\//;

if (mode === "prebuild") {
  const pkg = readFileSync("package.json", "utf8");
  const lock = existsSync("pnpm-lock.yaml")
    ? readFileSync("pnpm-lock.yaml", "utf8")
    : "";
  if (AI_PKG.test(pkg) || AI_PKG.test(lock)) {
    fail("AI SDK / LLM client dependencies are not allowed (security-p0 #20)");
  }

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
  // Covers all tracked text: src, scripts, AGENTS.md, .github, .cursor, docs…
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
