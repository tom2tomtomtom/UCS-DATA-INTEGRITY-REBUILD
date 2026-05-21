#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import { buildLiveSourceSnapshot } from "./lib/live-source-snapshot.mjs";

const args = parseArgs(process.argv.slice(2));
const outPath = args.out ?? `test-results/source-snapshots/phase10-source-snapshot-${Date.now()}.json`;
const maxRows = args.maxRows === "all" ? "all" : args.maxRows === undefined ? 100 : Number(args.maxRows);
const floatScenarioCodes = parseList(args.floatScenarioCodes);
const floatProjectIds = parseList(args.floatProjectIds);
const includeLinkedFeeSheets = args.includeLinkedFeeSheets === true;
const linkedFeeSheetLimit = args.linkedFeeSheetLimit === "all"
  ? "all"
  : args.linkedFeeSheetLimit === undefined
    ? undefined
    : Number(args.linkedFeeSheetLimit);
const linkedFeeSheetOffset = args.linkedFeeSheetOffset === undefined ? 0 : Number(args.linkedFeeSheetOffset);

if (maxRows !== "all" && (!Number.isInteger(maxRows) || maxRows < 1)) {
  throw new Error("--max-rows must be a positive integer or all.");
}
if (linkedFeeSheetLimit !== undefined && linkedFeeSheetLimit !== "all" && (!Number.isInteger(linkedFeeSheetLimit) || linkedFeeSheetLimit < 1)) {
  throw new Error("--linked-fee-sheet-limit must be a positive integer or all.");
}
if (!Number.isInteger(linkedFeeSheetOffset) || linkedFeeSheetOffset < 0) {
  throw new Error("--linked-fee-sheet-offset must be a non-negative integer.");
}

const { snapshot, summary } = await buildLiveSourceSnapshot({
  maxRows,
  floatScenarioCodes,
  floatProjectIds,
  includeLinkedFeeSheets,
  linkedFeeSheetLimit,
  linkedFeeSheetOffset
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
    } else if (arg === "--float-scenario-codes") {
      parsed.floatScenarioCodes = rawArgs[index + 1];
      index += 1;
    } else if (arg === "--float-project-ids") {
      parsed.floatProjectIds = rawArgs[index + 1];
      index += 1;
    } else if (arg === "--include-linked-fee-sheets") {
      parsed.includeLinkedFeeSheets = true;
    } else if (arg === "--linked-fee-sheet-limit") {
      parsed.linkedFeeSheetLimit = rawArgs[index + 1];
      index += 1;
    } else if (arg === "--linked-fee-sheet-offset") {
      parsed.linkedFeeSheetOffset = rawArgs[index + 1];
      index += 1;
    }
  }

  return parsed;
}

function parseList(value) {
  if (typeof value !== "string") return [];
  return value.split(",").map((item) => item.trim()).filter((item) => item !== "");
}
