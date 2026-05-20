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

  if (pkg.scripts?.["verify:phase3"] !== "npm run test && npm run typecheck && node scripts/verify-phase3.mjs") {
    fail("package.json must define verify:phase3 as test, typecheck, then scripts/verify-phase3.mjs");
  }

  if (pkg.scripts?.build !== "npm run verify:phase3") {
    fail("package.json build must run verify:phase3 once parser behaviours exist");
  }
}

function checkRequiredFiles() {
  const requiredFiles = [
    "src/lib/parsers/types.ts",
    "src/lib/parsers/shared.ts",
    "src/lib/parsers/fee-sheet.ts",
    "src/lib/parsers/pipeline.ts",
    "src/lib/parsers/production-revenue.ts",
    "src/lib/parsers/float.ts",
    "src/lib/parsers/index.ts",
    "tests/parsers/parser-contracts.test.ts",
    "tests/parsers/fee-sheet-parser.test.ts",
    "tests/parsers/pipeline-parser.test.ts",
    "tests/parsers/production-revenue-parser.test.ts",
    "tests/parsers/float-parser.test.ts",
    "fixtures/source-rows/fee-sheets/p3-b-basic.json",
    "fixtures/source-rows/pipeline/mixed-rows.json",
    "fixtures/source-rows/production-revenue/p3-d-production-revenue-rows.json",
    "fixtures/source-rows/float/p3-e-basic.json",
    "fixtures/parsed-facts/fee-sheets/p3-b-basic.json",
    "fixtures/parsed-facts/pipeline/mixed-rows.expected.json",
    "fixtures/parsed-facts/production-revenue/p3-d-production-revenue-facts.json",
    "fixtures/parsed-facts/float/p3-e-basic.json"
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) fail(`Missing required Phase 3 parser file: ${file}`);
  }
}

function checkNoOutOfPhaseSurfaces() {
  const bannedDirs = [
    "src/app",
    "src/pages",
    "src/components",
    "src/lib/canon-queries",
    "src/lib/db"
  ];

  for (const dir of bannedDirs) {
    if (exists(dir)) fail(`Phase 3 must not create out-of-phase directory: ${dir}`);
  }

  if (exists("supabase/migrations")) {
    const migrationFiles = listFiles("supabase/migrations").filter((file) => file.endsWith(".sql"));
    if (migrationFiles.length > 0) {
      fail(`Phase 3 must not apply or stage migration SQL: ${migrationFiles.join(", ")}`);
    }
  }
}

function checkParserCodeDoesNotCheat() {
  const parserFiles = listFiles("src/lib/parsers").filter((file) => file.endsWith(".ts"));
  const combined = parserFiles.map((file) => read(file)).join("\n");

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
    "DashboardDisplayContract",
    "displayRows",
    "visibleRows",
    "selectDashboardView",
    "INSERT ",
    "UPDATE ",
    "DELETE "
  ];

  for (const needle of forbiddenNeedles) {
    if (combined.includes(needle)) {
      fail(`Phase 3 parser code contains forbidden out-of-phase reference: ${needle}`);
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
      fail(`Phase 3 parser code contains forbidden out-of-phase ${label}`);
    }
  }
}

function checkParserExports() {
  const parserBarrel = read("src/lib/parsers/index.ts");
  const rootIndex = read("src/lib/index.ts");
  const requiredExports = [
    "createParserFactEvidence",
    "createParserResult",
    "createParserWarning",
    "parseArchivedFeeSheetRows",
    "parsePipelineRows",
    "parseProductionRevenueRows",
    "parseArchivedFloatRows",
    "PARSER_ADDITIVE_STATUSES"
  ];

  for (const exportedName of requiredExports) {
    if (!parserBarrel.includes(exportedName)) {
      fail(`Missing parser barrel export: ${exportedName}`);
    }
    if (!rootIndex.includes(exportedName)) {
      fail(`Missing root library parser export: ${exportedName}`);
    }
  }
}

function checkActiveParserTests() {
  const testFiles = listFiles("tests/parsers").filter((file) => file.endsWith(".test.ts"));
  if (testFiles.length < 5) {
    fail(`Expected at least 5 active parser test files, found ${testFiles.length}`);
  }

  const combinedTests = testFiles.map((file) => read(file)).join("\n");
  const activeTests = combinedTests.match(/\btest\(/g) ?? [];
  if (activeTests.length < 18) {
    fail(`Expected at least 18 active parser tests, found ${activeTests.length}`);
  }

  const requiredMarkers = [
    "CLIENT SUMMARY",
    "V-tab",
    "zero-fee",
    "first-tab Float ID",
    "TBC",
    "no-job",
    "archived",
    "unknown-status",
    "unsupported-attribution",
    "duplicate",
    "manual Float candidates",
    "inactive",
    "multi-person",
    "corrected Float joins",
    "display rows",
    "dashboard totals"
  ];

  for (const marker of requiredMarkers) {
    if (!combinedTests.includes(marker)) {
      fail(`Missing Phase 3 parser test coverage marker: ${marker}`);
    }
  }
}

function checkFixtureCoverage() {
  const fixtureFiles = [
    "fixtures/source-rows/fee-sheets/p3-b-basic.json",
    "fixtures/source-rows/pipeline/mixed-rows.json",
    "fixtures/source-rows/production-revenue/p3-d-production-revenue-rows.json",
    "fixtures/source-rows/float/p3-e-basic.json",
    "fixtures/parsed-facts/fee-sheets/p3-b-basic.json",
    "fixtures/parsed-facts/pipeline/mixed-rows.expected.json",
    "fixtures/parsed-facts/production-revenue/p3-d-production-revenue-facts.json",
    "fixtures/parsed-facts/float/p3-e-basic.json"
  ];

  const combinedFixtures = fixtureFiles.filter(exists).map((file) => read(file)).join("\n");
  const requiredMarkers = [
    "CLIENT SUMMARY",
    "v_tab",
    "source_summary",
    "10480262",
    "TBC",
    "literally_empty",
    "UNKNOWN",
    "archived",
    "inactive",
    "manual_duplicate",
    "float_candidate",
    "assignedPeople",
    "rawRowIds",
    "additiveStatus"
  ];

  for (const marker of requiredMarkers) {
    if (!combinedFixtures.includes(marker)) {
      fail(`Missing Phase 3 fixture coverage marker: ${marker}`);
    }
  }
}

function checkParserFactsUseEvidenceHelpers() {
  const sourceParserFiles = [
    "src/lib/parsers/fee-sheet.ts",
    "src/lib/parsers/pipeline.ts",
    "src/lib/parsers/production-revenue.ts",
    "src/lib/parsers/float.ts"
  ];

  for (const file of sourceParserFiles) {
    const content = read(file);

    if (!content.includes("createParserFactEvidence")) {
      fail(`Parser must create fact evidence through shared helper: ${file}`);
    }
    if (!content.includes("rawRowIds")) {
      fail(`Parser must preserve raw row IDs: ${file}`);
    }
    if (!content.includes("sourceRefs")) {
      fail(`Parser must preserve source refs: ${file}`);
    }
    if (!content.includes("additiveStatus")) {
      fail(`Parser must explicitly mark additive status: ${file}`);
    }
  }
}

function run() {
  checkPackageScripts();
  checkRequiredFiles();
  checkNoOutOfPhaseSurfaces();
  checkParserCodeDoesNotCheat();
  checkParserExports();
  checkActiveParserTests();
  checkFixtureCoverage();
  checkParserFactsUseEvidenceHelpers();

  if (failures.length > 0) {
    console.error("Phase 3 verification failed:");
    for (const failure of failures) {
      console.error(`FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log("Phase 3 verification passed.");
}

run();
