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

function listFiles(dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];

  const files = [];
  const stack = [absolute];

  while (stack.length > 0) {
    const current = stack.pop();

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const relative = path.relative(root, full);

      if (entry.isDirectory()) {
        stack.push(full);
      } else {
        files.push(relative);
      }
    }
  }

  return files.sort();
}

function checkPackageScripts() {
  const pkg = JSON.parse(read("package.json"));

  if (pkg.scripts?.["verify:phase5"] !== "npm run test && npm run typecheck && node scripts/verify-phase5.mjs") {
    fail("package.json must define verify:phase5 as test, typecheck, then scripts/verify-phase5.mjs");
  }

  if (pkg.scripts?.build !== "npm run verify:phase5") {
    fail("package.json build must run verify:phase5 once display contract behaviours exist");
  }
}

function checkRequiredFiles() {
  const requiredFiles = [
    "src/lib/display/contract.ts",
    "src/lib/display/project-rows.ts",
    "src/lib/display/rollups.ts",
    "src/lib/display/float-reconciliation.ts",
    "src/lib/display/csv.ts",
    "src/lib/display/traces.ts",
    "src/lib/display/approval-output.ts",
    "tests/display/display-contract-shape.test.ts",
    "tests/display/display-totalling-laws.test.ts",
    "tests/display/project-rows.test.ts",
    "tests/display/rollups.test.ts",
    "tests/display/scope-preservation.test.ts",
    "tests/display/float-reconciliation.test.ts",
    "tests/display/csv.test.ts",
    "tests/display/traces.test.ts",
    "tests/display/approval-output.test.ts"
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) fail(`Missing required Phase 5 display file: ${file}`);
  }
}

function checkNoOutOfPhaseSurfaces() {
  const bannedDirs = [
    "src/app",
    "src/pages",
    "src/components",
    "src/lib/db"
  ];

  for (const dir of bannedDirs) {
    if (exists(dir)) fail(`Phase 5 must not create out-of-phase directory: ${dir}`);
  }

  if (exists("supabase/migrations")) {
    const migrationFiles = listFiles("supabase/migrations").filter((file) => file.endsWith(".sql"));
    if (migrationFiles.length > 0) {
      fail(`Phase 5 must not apply or stage migration SQL: ${migrationFiles.join(", ")}`);
    }
  }
}

function checkDisplayCodeDoesNotCheat() {
  const displayFiles = listFiles("src/lib/display").filter((file) => file.endsWith(".ts"));
  const combined = displayFiles.map((file) => read(file)).join("\n");

  const forbiddenNeedles = [
    "process.env",
    "googleapis",
    "@supabase",
    "createClient",
    "node:http",
    "node:https",
    "axios",
    "http://",
    "https://",
    "selectDashboardView",
    "getProjectsList",
    "getUnmatchedPipelineRows",
    "getOrphanFloatRows",
    "INSERT ",
    "UPDATE ",
    "DELETE "
  ];

  for (const needle of forbiddenNeedles) {
    if (combined.includes(needle)) {
      fail(`Phase 5 display code contains forbidden out-of-phase reference: ${needle}`);
    }
  }

  const forbiddenPatterns = [
    ["globalThis.fetch call", /\bglobalThis\.fetch\s*\(/],
    ["window.fetch call", /\bwindow\.fetch\s*\(/],
    ["await fetch call", /\bawait\s+fetch\s*\(/],
    ["return fetch call", /\breturn\s+fetch\s*\(/],
    ["assigned fetch call", /=\s*fetch\s*\(/],
    ["literal URL fetch call", /\bfetch\s*\(\s*["'`]/]
  ];

  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(combined)) {
      fail(`Phase 5 display code contains forbidden ${label}`);
    }
  }
}

function checkActiveDisplayTests() {
  const testFiles = listFiles("tests/display").filter((file) => file.endsWith(".test.ts"));
  if (testFiles.length < 2) {
    fail(`Expected at least 2 active display test files, found ${testFiles.length}`);
  }

  const combined = testFiles.map((file) => read(file)).join("\n");
  const activeTests = combined.match(/\btest\(/g) ?? [];
  if (activeTests.length < 4) {
    fail(`Expected at least 4 active display tests, found ${activeTests.length}`);
  }

  const requiredMarkers = [
    "single display contract",
    "supported totals traceable",
    "sums additive",
    "non-additive",
    "Unsupported",
    "sourceTrace",
    "visibleRows",
    "csvRows",
    "legacySelectorOutput",
    "builds rows, rollups, and CSV from the same scoped display contract",
    "filters project rows to the active display scope",
    "LDN Q1 Design",
    "Pipeline does not support",
    "exact client",
    "PCS00250",
    "BT_RAW_CACHE",
    "raw/cache",
    "out-of-scope Float facts",
    "approval contract output"
  ];

  for (const marker of requiredMarkers) {
    if (!combined.includes(marker)) {
      fail(`Missing Phase 5 display test coverage marker: ${marker}`);
    }
  }
}

function checkExports() {
  const rootIndex = read("src/lib/index.ts");
  const contract = read("src/lib/display/contract.ts");
  const requiredExports = [
    "buildDashboardDisplayContract",
    "buildProjectRows",
    "buildDisplayRollups",
    "createFloatReconciliationChecks",
    "buildCsvRowsFromDisplayContract",
    "buildCompactTraceRowsFromDisplayContract",
    "buildApprovalOutputFromDisplayContract"
  ];

  if (!contract.includes("buildDashboardDisplayContract")) {
    fail("Display contract must export buildDashboardDisplayContract");
  }

  for (const exportedName of requiredExports) {
    if (!rootIndex.includes(exportedName)) {
      fail(`Root library must export ${exportedName}`);
    }
  }
}

function checkDisplayModulesContainDoctrineAnchors() {
  const fileMarkers = {
    "src/lib/display/contract.ts": [
      "filterFactsByScope",
      "buildProjectRows",
      "buildDisplayRollups",
      "createFloatReconciliationChecks",
      "buildCsvRowsFromDisplayContract"
    ],
    "src/lib/display/project-rows.ts": [
      "filterFactsByScope",
      "sourceLabels",
      "float_visible",
      "rowType"
    ],
    "src/lib/display/rollups.ts": [
      "scopeForRollupDrilldown",
      "dimensionSupportsPipelineAndProduction",
      "Pipeline does not support",
      "Production Revenue does not support"
    ],
    "src/lib/display/float-reconciliation.ts": [
      "filterFactsByScope",
      "FLOAT_VISIBLE_CACHE_MISSING_CACHE",
      "FLOAT_INACTIVE_VISIBLE_HOURS",
      "PCS00250_RAW_CACHE_UNRESOLVED",
      "BT_RAW_CACHE_UNRESOLVED"
    ],
    "src/lib/display/csv.ts": ["visibleRows", "unsupported", "sourceTrace"],
    "src/lib/display/traces.ts": ["MetricValue", "sourceRefs", "unsupported"],
    "src/lib/display/approval-output.ts": ["heroTotals", "footerTotals", "reconciliation"]
  };

  for (const [file, markers] of Object.entries(fileMarkers)) {
    const source = read(file);

    for (const marker of markers) {
      if (!source.includes(marker)) {
        fail(`${file} is missing doctrine anchor: ${marker}`);
      }
    }
  }
}

function run() {
  checkPackageScripts();
  checkRequiredFiles();
  checkNoOutOfPhaseSurfaces();
  checkDisplayCodeDoesNotCheat();
  checkActiveDisplayTests();
  checkExports();
  checkDisplayModulesContainDoctrineAnchors();

  if (failures.length > 0) {
    console.error("Phase 5 verification failed:");
    for (const failure of failures) {
      console.error(`FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log("Phase 5 verification passed.");
}

run();
