#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { buildLiveSourceSnapshot } from "./lib/live-source-snapshot.mjs";

const args = parseArgs(process.argv.slice(2));
const outPath = args.out ?? `test-results/source-snapshots/phase10-source-snapshot-${Date.now()}.json`;
const maxRows = args.maxRows === undefined ? 100 : Number(args.maxRows);

if (!Number.isInteger(maxRows) || maxRows < 1) {
  throw new Error("--max-rows must be a positive integer.");
}

const { snapshot, summary } = await buildLiveSourceSnapshot({
  maxRows
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);

process.stdout.write(`${JSON.stringify({ ...summary, outPath }, null, 2)}\n`);

function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--out") {
      parsed.out = rawArgs[index + 1];
      index += 1;
    } else if (arg === "--max-rows") {
      parsed.maxRows = rawArgs[index + 1];
      index += 1;
    }
  }

  return parsed;
}
