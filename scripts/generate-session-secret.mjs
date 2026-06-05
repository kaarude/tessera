#!/usr/bin/env node
// Generate a strong SESSION_SECRET and write it to `.session_secret` if
// the file doesn't exist. Used by `npm run init` and the docker-compose
// quick-start instructions.
//
//   node scripts/generate-session-secret.mjs
//
// Then either point Tessera at it via `SESSION_SECRET=$(cat .session_secret)`
// or copy its contents into your .env file.

import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(process.cwd(), ".session_secret");
if (existsSync(target)) {
  console.log(`.session_secret already exists at ${target} — not overwriting.`);
  process.exit(0);
}
const secret = randomBytes(48).toString("base64");
writeFileSync(target, secret + "\n", { mode: 0o600 });
console.log(`Wrote a new SESSION_SECRET to ${target}`);
console.log(`Length: ${secret.length} characters`);
console.log(`\nAdd this to your .env file:\n  SESSION_SECRET="${secret}"`);
