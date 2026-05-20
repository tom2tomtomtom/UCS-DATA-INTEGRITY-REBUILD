#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

function findInitialMigration() {
  const migrationsDir = path.join(root, "supabase", "migrations");
  if (!fs.existsSync(migrationsDir)) return undefined;

  const fileName = fs
    .readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith("_initial_integrity_schema.sql"))
    .sort()
    .at(0);

  return fileName === undefined ? undefined : path.join("supabase", "migrations", fileName);
}

function checkPackageScripts() {
  const pkg = JSON.parse(read("package.json"));

  if (pkg.scripts?.["verify:phase8"] !== "npm run test && npm run typecheck && next build && node scripts/verify-phase8.mjs") {
    fail("package.json must define verify:phase8 as test, typecheck, next build, then scripts/verify-phase8.mjs");
  }
}

function checkRequiredFiles() {
  const requiredFiles = [
    "src/lib/env/readiness.ts",
    "tests/env/readiness.test.ts",
    "src/lib/schema/schema-law.ts",
    "tests/schema/schema-law-gate.test.ts",
    "supabase/config.toml"
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) fail(`Missing Phase 8 file: ${file}`);
  }

  const migrationPath = findInitialMigration();
  if (migrationPath === undefined) fail("Missing initial integrity schema migration.");
}

function checkSchemaLawMarkers() {
  if (!exists("src/lib/schema/schema-law.ts") || !exists("tests/schema/schema-law-gate.test.ts")) return;

  const combined = [
    read("src/lib/schema/schema-law.ts"),
    read("tests/schema/schema-law-gate.test.ts")
  ].join("\n");
  const requiredMarkers = [
    "CORE_SCHEMA_TABLES",
    "source_batches",
    "raw_source_rows",
    "parsed_facts",
    "source_conflicts",
    "display_contract_snapshots",
    "warning_events",
    "user_overlays",
    "audit_log",
    "raw_row_ids",
    "source_refs",
    "is_additive",
    "lifecycle_state",
    "legacy_comparison_only",
    "READ_ONLY_SQL_NOT_DIAGNOSTIC_ONLY",
    "RAW_ROWS_MUTABLE",
    "FORBIDDEN_TABLE_float_allocations",
    "RLS_MISSING_raw_source_rows",
    "DEFAULT_TABLE_PRIVILEGES_NOT_REVOKED"
  ];

  for (const marker of requiredMarkers) {
    if (!combined.includes(marker)) fail(`Missing Phase 8 schema law marker: ${marker}`);
  }
}

function checkMigrationMarkers() {
  const migrationPath = findInitialMigration();
  if (migrationPath === undefined) return;

  const sql = read(migrationPath);
  const requiredMarkers = [
    "alter default privileges in schema public revoke all on tables from anon, authenticated",
    "create schema if not exists app_private",
    "create table public.source_batches",
    "create table public.raw_source_rows",
    "create table public.parsed_facts",
    "create table public.source_conflicts",
    "create table public.display_contract_snapshots",
    "create table public.warning_events",
    "create table public.user_overlays",
    "create table public.audit_log",
    "legacy_comparison_only",
    "read_only_sql_diagnostic_only",
    "raw_source_rows_no_update",
    "raw_source_rows_no_delete",
    "enable row level security",
    "revoke all on table",
    "from anon, authenticated"
  ];

  for (const marker of requiredMarkers) {
    if (!sql.toLowerCase().includes(marker.toLowerCase())) {
      fail(`Missing migration marker: ${marker}`);
    }
  }

  if (/create\s+table\s+public\.(float_allocations|float_tasks_canon|pipeline_data|dashboard_cache)/i.test(sql)) {
    fail("Initial schema migration must not recreate old cache or mirror tables.");
  }

  if (/security\s+definer/i.test(sql)) {
    fail("Initial schema migration must not add SECURITY DEFINER functions.");
  }
}

function run() {
  checkPackageScripts();
  checkRequiredFiles();
  checkSchemaLawMarkers();
  checkMigrationMarkers();

  if (failures.length > 0) {
    console.error("Phase 8 verification failed:");
    for (const failure of failures) {
      console.error(`FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log("Phase 8 verification passed.");
}

run();
