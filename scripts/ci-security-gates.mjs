import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const mode = process.argv[2] || "prebuild";

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (mode === "prebuild") {
  const pkg = readFileSync("package.json", "utf8");
  const lock = existsSync("pnpm-lock.yaml")
    ? readFileSync("pnpm-lock.yaml", "utf8")
    : "";
  if (/"ai"|@ai-sdk\//.test(pkg) || /"ai@|@ai-sdk\//.test(lock)) {
    fail("AI SDK dependencies are not allowed (security-p0 #20)");
  }

  const textFiles = walk(".").filter((f) =>
    [".ts", ".tsx", ".js", ".mjs", ".json", ".yml", ".yaml", ".md", ".css"].includes(
      extname(f),
    ),
  );
  const nextPublicSecret =
    /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|DATABASE|PRIVATE|API_KEY)/i;
  for (const f of textFiles) {
    if (f.includes("pnpm-lock.yaml")) continue;
    const content = readFileSync(f, "utf8");
    if (nextPublicSecret.test(content) && !f.includes("ci-security-gates")) {
      fail(`Forbidden NEXT_PUBLIC secret-like name in ${f}`);
    }
  }

  // Bidirectional controls, zero-width, and language-tag characters
  const hidden =
    /[\u202A-\u202E\u2066-\u2069\u200B-\u200F\uFEFF]|[\u{E0000}-\u{E007F}]/u;
  for (const f of walk("src")) {
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
    console.log("No .next/static; skip");
    process.exit(0);
  }
  const secretLike =
    /postgres:\/\/|neon\.tech|-pooler\.|Bearer [A-Za-z0-9._-]{16,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/;
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
