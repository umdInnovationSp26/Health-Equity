// One-off helper: parse .env.local and push each var to Vercel.
// Values are never printed — only masked previews.
//   node scripts/push-env.mjs            # dry run, shows what would be pushed
//   node scripts/push-env.mjs --apply    # actually pushes to Vercel
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const TARGETS = ["production", "preview", "development"];
// Known-corrupt in .env.local — pushing it would just propagate garbage.
// Re-add from a fresh service-account JSON instead.
const SKIP = new Set(["FIREBASE_PRIVATE_KEY"]);

/** Minimal dotenv parser: handles unquoted, single/double-quoted, and multi-line quoted values. */
function parseEnv(src) {
  const out = new Map();
  const lines = src.replace(/\r\n/g, "\n").split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!m) continue;

    const key = m[1];
    let rest = m[2];
    const quote = rest[0] === '"' || rest[0] === "'" ? rest[0] : null;

    if (!quote) {
      out.set(key, rest.split("#")[0].trim());
      continue;
    }

    rest = rest.slice(1);
    let value = "";
    let closed = false;

    // Consume until the matching closing quote, absorbing newlines.
    for (;;) {
      const end = rest.indexOf(quote);
      if (end !== -1) {
        value += rest.slice(0, end);
        closed = true;
        break;
      }
      value += rest + "\n";
      if (++i >= lines.length) break;
      rest = lines[i];
    }

    if (!closed) throw new Error(`Unterminated quote for ${key}`);
    // Only double quotes honour backslash escapes.
    if (quote === '"') value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
    out.set(key, value);
  }
  return out;
}

const mask = (v) =>
  v.length <= 10 ? `${v[0]}***${v.at(-1)}` : `${v.slice(0, 4)}…${v.slice(-4)}`;

const env = parseEnv(readFileSync(".env.local", "utf8"));
const apply = process.argv.includes("--apply");

console.log(`Parsed ${env.size} variables from .env.local\n`);
for (const [k, v] of env) {
  const multiline = v.includes("\n");
  console.log(
    `  ${k.padEnd(42)} len=${String(v.length).padEnd(5)} ${multiline ? "MULTILINE " : ""}${mask(v.replace(/\n/g, "\\n"))}`,
  );
}

// Sanity checks against what the code actually reads.
const REQUIRED = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
];
const missing = REQUIRED.filter((k) => !env.has(k));
if (missing.length) {
  console.log(`\n⚠ Referenced in code but absent from .env.local:`);
  for (const k of missing) console.log(`    ${k}`);
}

if (!apply) {
  console.log(`\nDry run. Re-run with --apply to push to Vercel.`);
  process.exit(0);
}

console.log(`\nPushing to Vercel (${TARGETS.join(", ")})…\n`);
for (const [key, value] of env) {
  if (SKIP.has(key)) {
    console.log(`  – ${key} (skipped)`);
    continue;
  }
  for (const target of TARGETS) {
    // `vercel env add` reads the value from stdin, which keeps it off the
    // command line and preserves newlines in multi-line values.
    const r = spawnSync(
      "vercel",
      ["env", "add", key, target, "--force"],
      { input: value, encoding: "utf8", shell: true },
    );
    const ok = r.status === 0;
    console.log(`  ${ok ? "✓" : "✗"} ${key} → ${target}`);
    if (!ok) console.log(`      ${(r.stderr || r.stdout || "").trim().split("\n").slice(-3).join("\n      ")}`);
  }
}
