#!/usr/bin/env node

import fs from "node:fs";

import { buildSourceSnapshotImportPlan } from "./lib/source-import-report.mjs";
import { writeSourceSnapshotImportToSupabase } from "./lib/source-snapshot-supabase-writer.mjs";

const EXPECTED_REBUILD_SUPABASE_REF = "nxrzhwqsswhjgeouxsyr";

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.filePath === undefined) {
    usage();
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(args.filePath, "utf8"));
  const plan = buildSourceSnapshotImportPlan(snapshot);
  const dryRun = !args.write;

  if (!dryRun) {
    assertWriteGuards({
      env: process.env,
      target: args.target,
      expectedRef: args.expectedRef
    });
  }

  const report = await writeSourceSnapshotImportToSupabase(plan, {
    dryRun,
    allowWrite: args.write,
    chunkSize: args.chunkSize
  });

  process.stdout.write(`${JSON.stringify(safeReport(report), null, 2)}\n`);
}

function parseArgs(argv) {
  const parsed = {
    target: "staging",
    expectedRef: EXPECTED_REBUILD_SUPABASE_REF,
    write: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      parsed.write = false;
      continue;
    }

    if (arg === "--write") {
      parsed.write = true;
      continue;
    }

    if (arg === "--target") {
      parsed.target = requiredNext(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--expected-ref") {
      parsed.expectedRef = requiredNext(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--chunk-size") {
      parsed.chunkSize = Number(requiredNext(argv, index, arg));
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (parsed.filePath !== undefined) {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }

    parsed.filePath = arg;
  }

  return parsed;
}

function requiredNext(argv, index, flag) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function assertWriteGuards({ env, target, expectedRef }) {
  const failures = [];
  const databaseUrl = env.DATABASE_URL ?? "";
  const legacyDatabaseUrl = env.LEGACY_DATABASE_URL ?? "";
  const publicSupabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (target !== "staging") {
    failures.push("target must be staging for source snapshot imports");
  }

  if (env.APP_ENV !== "staging") {
    failures.push("APP_ENV must be staging");
  }

  if (env.MUTATION_GUARD !== "read_only") {
    failures.push("MUTATION_GUARD must be read_only");
  }

  if (!databaseUrl.includes(expectedRef)) {
    failures.push("DATABASE_URL must point at the rebuild Supabase ref");
  }

  if (!publicSupabaseUrl.includes(expectedRef)) {
    failures.push("NEXT_PUBLIC_SUPABASE_URL must point at the rebuild Supabase ref");
  }

  if (legacyDatabaseUrl !== "" && legacyDatabaseUrl === databaseUrl) {
    failures.push("LEGACY_DATABASE_URL must be distinct from DATABASE_URL");
  }

  if (failures.length > 0) {
    throw new Error(`Refusing source snapshot import write: ${failures.join("; ")}.`);
  }
}

function safeReport(report) {
  return {
    status: report.status,
    dryRun: report.dryRun,
    sourceMutation: report.sourceMutation,
    snapshotId: report.snapshotId,
    capturedAt: report.capturedAt,
    tableCounts: report.tableCounts,
    sourceReport: report.sourceReport,
    warnings: report.warnings
  };
}

function usage() {
  process.stderr.write(
    "Usage: node scripts/import-source-snapshot.mjs <snapshot.json> [--dry-run|--write] [--target staging] [--chunk-size 500]\n"
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
