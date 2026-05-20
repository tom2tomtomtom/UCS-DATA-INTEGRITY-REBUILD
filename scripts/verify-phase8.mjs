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
    "src/lib/source-import/snapshot-import.ts",
    "tests/source-import/snapshot-import.test.ts",
    "tests/source-import/phase8-source-import-verifier.test.ts",
    "scripts/dry-run-source-import.mjs",
    "scripts/lib/source-import-report.mjs",
    "fixtures/source-import/p8c-redacted-snapshot.json",
    "src/lib/dual-run/dual-run-compare.ts",
    "tests/dual-run/dual-run-compare.test.ts",
    "tests/dual-run/phase8-dual-run-verifier.test.ts",
    "scripts/dual-run-compare.mjs",
    "scripts/lib/dual-run-compare.mjs",
    "fixtures/dual-run/p8d-basic.json",
    "src/lib/scenarios/named-scenario-report.ts",
    "tests/scenarios/named-scenario-report.test.ts",
    "tests/scenarios/phase8-named-scenario-verifier.test.ts",
    "scripts/named-scenario-report.mjs",
    "scripts/lib/named-scenario-report.mjs",
    "src/lib/ui/ui-proof.ts",
    "tests/ui/ui-proof-manifest.test.ts",
    "tests/ui/phase8-ui-proof-verifier.test.ts",
    "scripts/ui-proof-manifest.mjs",
    "scripts/lib/ui-proof-manifest.mjs",
    "supabase/config.toml"
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) fail(`Missing Phase 8 file: ${file}`);
  }

  const migrationPath = findInitialMigration();
  if (migrationPath === undefined) fail("Missing initial integrity schema migration.");
}

function checkSourceImportDoesNotCheat() {
  const files = [
    "src/lib/source-import/snapshot-import.ts",
    "scripts/dry-run-source-import.mjs",
    "scripts/lib/source-import-report.mjs"
  ];

  if (!files.every(exists)) return;

  const combined = files.map(read).join("\n");
  const forbiddenNeedles = [
    "@supabase",
    "createClient",
    "googleapis",
    "FLOAT_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GOOGLE_SERVICE_ACCOUNT_KEY",
    "fetch(",
    "INSERT ",
    "UPDATE ",
    "DELETE ",
    "db push",
    "migration up"
  ];

  for (const needle of forbiddenNeedles) {
    if (combined.includes(needle)) {
      fail(`Phase 8 source import contains forbidden source or database mutation path: ${needle}`);
    }
  }
}

function checkSourceImportMarkers() {
  const files = [
    "src/lib/source-import/snapshot-import.ts",
    "tests/source-import/snapshot-import.test.ts",
    "scripts/dry-run-source-import.mjs",
    "fixtures/source-import/p8c-redacted-snapshot.json"
  ];

  if (!files.every(exists)) return;

  const combined = files.map(read).join("\n");
  const requiredMarkers = [
    "buildSourceSnapshotImportPlan",
    "readOnly",
    "Source row is missing stableSourceRowKey",
    "legacy_cache_imported_as_evidence_only",
    "legacy_cache_evidence_only",
    "read_only_sql",
    "manual_snapshot",
    "legacy_import",
    "dry-run-source-import",
    "./lib/source-import-report.mjs",
    "fixtures/source-import/p8c-redacted-snapshot.json"
  ];

  for (const marker of requiredMarkers) {
    if (!combined.includes(marker)) {
      fail(`Missing Phase 8 source import marker: ${marker}`);
    }
  }
}

function checkDualRunDoesNotCheat() {
  const files = [
    "src/lib/dual-run/dual-run-compare.ts",
    "scripts/dual-run-compare.mjs",
    "scripts/lib/dual-run-compare.mjs"
  ];

  if (!files.every(exists)) return;

  const combined = files.map(read).join("\n");
  const forbiddenNeedles = [
    "@supabase",
    "createClient",
    "googleapis",
    "selectDashboardView",
    "getProjectsList",
    "fetch(",
    "INSERT ",
    "UPDATE ",
    "DELETE "
  ];

  for (const needle of forbiddenNeedles) {
    if (combined.includes(needle)) {
      fail(`Phase 8 dual-run comparator contains forbidden product-truth or mutation path: ${needle}`);
    }
  }
}

function checkDualRunMarkers() {
  const files = [
    "src/lib/dual-run/dual-run-compare.ts",
    "tests/dual-run/dual-run-compare.test.ts",
    "scripts/dual-run-compare.mjs",
    "fixtures/dual-run/p8d-basic.json"
  ];

  if (!files.every(exists)) return;

  const combined = files.map(read).join("\n");
  const requiredMarkers = [
    "Old dashboard lane must be comparison evidence only",
    "old_bug",
    "new_bug",
    "source_issue",
    "intentional_change",
    "unresolved",
    "all lanes disagree",
    "comparisonOnly",
    "fixtures/dual-run/p8d-basic.json"
  ];

  for (const marker of requiredMarkers) {
    if (!combined.includes(marker)) {
      fail(`Missing Phase 8 dual-run marker: ${marker}`);
    }
  }
}

function checkNamedScenarioMarkers() {
  const files = [
    "src/lib/scenarios/named-scenario-report.ts",
    "tests/scenarios/named-scenario-report.test.ts",
    "scripts/named-scenario-report.mjs",
    "scripts/lib/named-scenario-report.mjs"
  ];

  if (!files.every(exists)) return;

  const combined = files.map(read).join("\n");
  const requiredMarkers = [
    "ldn-q1-design",
    "ucs04787",
    "ucs05186",
    "ucs04154",
    "pcs00250",
    "usa00262",
    "usa00323",
    "bt-raw-without-cache",
    "tbc-pipeline-identity",
    "archived-production-revenue",
    "exact-client-drilldown",
    "new_code_bug",
    "same_scope_same_number",
    "sold_hours_false_zero_guard",
    "source_or_cache_warning"
  ];

  for (const marker of requiredMarkers) {
    if (!combined.includes(marker)) {
      fail(`Missing Phase 8 named scenario marker: ${marker}`);
    }
  }
}

function checkUiProofMarkers() {
  const files = [
    "src/lib/ui/ui-proof.ts",
    "tests/ui/ui-proof-manifest.test.ts",
    "scripts/ui-proof-manifest.mjs",
    "scripts/lib/ui-proof-manifest.mjs"
  ];

  if (!files.every(exists)) return;

  const combined = files.map(read).join("\n");
  const requiredMarkers = [
    "deterministic-ui-proof",
    "dashboard-home",
    "projects-design-drilldown",
    "project-detail-ucs04787",
    "float-diagnostics",
    "data-quality",
    "approval-audit",
    "chat-evidence",
    "Design department row opens Projects with the same scope",
    "redacted_or_fixture_safe",
    "Needs Codex",
    "BT_RAW_CACHE_UNRESOLVED",
    "PCS00250_RAW_CACHE_UNRESOLVED"
  ];

  for (const marker of requiredMarkers) {
    if (!combined.includes(marker)) {
      fail(`Missing Phase 8 UI proof marker: ${marker}`);
    }
  }
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
  checkSourceImportDoesNotCheat();
  checkSourceImportMarkers();
  checkDualRunDoesNotCheat();
  checkDualRunMarkers();
  checkNamedScenarioMarkers();
  checkUiProofMarkers();
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
