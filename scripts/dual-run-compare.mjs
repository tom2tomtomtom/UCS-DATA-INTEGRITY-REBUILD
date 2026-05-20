#!/usr/bin/env node

import fs from "node:fs";

import { compareDualRunSnapshots } from "./lib/dual-run-compare.mjs";

const filePath = process.argv[2];

if (filePath === undefined) {
  console.error("Usage: node scripts/dual-run-compare.mjs <comparison.json>");
  process.exit(1);
}

try {
  const input = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const report = compareDualRunSnapshots(input);

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
