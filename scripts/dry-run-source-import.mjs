#!/usr/bin/env node

import fs from "node:fs";

import { buildSourceSnapshotImportPlan } from "./lib/source-import-report.mjs";

const filePath = process.argv[2];

if (filePath === undefined) {
  console.error("Usage: node scripts/dry-run-source-import.mjs <snapshot.json>");
  process.exit(1);
}

try {
  const snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const plan = buildSourceSnapshotImportPlan(snapshot);

  process.stdout.write(`${JSON.stringify(plan.report, null, 2)}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
