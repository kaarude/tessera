// One-off codemod used during the Tessera migration to inject error-throwing
// into the many ad-hoc `fetch(...)` calls in app/components. It is preserved
// here for historical context. You do NOT need to run it on a fresh checkout.
// New code uses `lib/api.ts` instead.
//
// Usage: node scripts/fix-fetch-pattern.mjs   (from the project root)

import { readFileSync, writeFileSync } from "node:fs";
import { globSync } from "glob";

const files = globSync("app/**/*.tsx", { cwd: process.cwd() }).concat(
  globSync("components/**/*.tsx", { cwd: process.cwd() })
);

for (const file of files) {
  let content = readFileSync(file, "utf8");
  const original = content;

  content = content.replace(
    /(queryFn: async \(\) => \{[\s\S]*?const res = await fetch\([^)]+\);\n\s*)return res\.json\(\);/g,
    "$1const data = await res.json();\n      if (!res.ok) throw new Error(data.error || \"Request failed\");\n      return data;"
  );

  content = content.replace(
    /(queryFn: async \(\) => \{[\s\S]*?const res = await fetch\([\s\S]*?\);\n\s*)return res\.json\(\);/g,
    "$1const data = await res.json();\n      if (!res.ok) throw new Error(data.error || \"Request failed\");\n      return data;"
  );

  if (content !== original) {
    writeFileSync(file, content);
    console.log("Fixed", file);
  }
}
