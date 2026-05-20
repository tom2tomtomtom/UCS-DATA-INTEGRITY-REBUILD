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
  if (pkg.scripts?.["verify:phase2"] !== "npm run test && npm run typecheck && node scripts/verify-phase2.mjs") {
    fail("package.json must define verify:phase2 as test, typecheck, then scripts/verify-phase2.mjs");
  }
  if (pkg.scripts?.build !== "npm run verify:phase2") {
    fail("package.json build must run verify:phase2 once Phase 2 behaviours exist");
  }
}

function checkRequiredFiles() {
  const requiredFiles = [
    "src/lib/source-archive/types.ts",
    "src/lib/source-archive/row-classifier.ts",
    "src/lib/source-archive/archive-store.ts",
    "src/lib/source-archive/source-pull.ts",
    "src/lib/source-archive/source-row-browser.ts",
    "src/lib/source-archive/index.ts",
    "tests/source-archive/source-archive-types.test.ts",
    "tests/source-archive/row-classifier.test.ts",
    "tests/source-archive/archive-store.test.ts",
    "tests/source-archive/source-pull.test.ts",
    "tests/source-archive/source-row-browser.test.ts"
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) fail(`Missing required Phase 2 source archive file: ${file}`);
  }
}

function checkNoOutOfPhaseSurfaces() {
  const bannedDirs = [
    "src/app",
    "src/pages",
    "src/components",
    "src/lib/parsers",
    "src/lib/canon-queries",
    "src/lib/db"
  ];

  for (const dir of bannedDirs) {
    if (exists(dir)) fail(`Phase 2 must not create out-of-phase directory: ${dir}`);
  }

  if (exists("supabase/migrations")) {
    const migrationFiles = listFiles("supabase/migrations").filter((file) => file.endsWith(".sql"));
    if (migrationFiles.length > 0) {
      fail(`Phase 2 must not apply or stage migration SQL: ${migrationFiles.join(", ")}`);
    }
  }
}

function checkSourceArchiveDoesNotCheat() {
  const sourceFiles = listFiles("src/lib/source-archive").filter((file) => file.endsWith(".ts"));
  const combined = sourceFiles.map((file) => read(file)).join("\n");

  const forbiddenNeedles = [
    "process.env",
    "googleapis",
    "@supabase",
    "createClient",
    "node:http",
    "node:https",
    "axios",
    "ParsedFact",
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
      fail(`Phase 2 source archive code contains forbidden out-of-phase reference: ${needle}`);
    }
  }
}

function checkActiveSourceArchiveTests() {
  const testFiles = listFiles("tests/source-archive").filter((file) => file.endsWith(".test.ts"));
  if (testFiles.length < 5) {
    fail(`Expected at least 5 active source archive test files, found ${testFiles.length}`);
  }

  const combined = testFiles.map((file) => read(file)).join("\n");
  const activeTests = combined.match(/\btest\(/g) ?? [];
  if (activeTests.length < 25) {
    fail(`Expected at least 25 active source archive tests, found ${activeTests.length}`);
  }

  const requiredNeedles = [
    "soldFee: 0",
    "soldHours: 12",
    "TBC",
    "Archived production job",
    "inactive",
    "provisional",
    "unmatched",
    "duplicate",
    "literally_empty",
    "readOnly: true",
    "displayRows",
    "visibleRows"
  ];

  for (const needle of requiredNeedles) {
    if (!combined.includes(needle)) {
      fail(`Missing Phase 2 test coverage marker: ${needle}`);
    }
  }
}

function checkExports() {
  const barrel = read("src/lib/source-archive/index.ts");
  const rootIndex = read("src/lib/index.ts");
  const requiredExports = [
    "classifyRawSourceRow",
    "createSkippedSourceRow",
    "createInMemorySourceArchiveStore",
    "createFixturePullResult",
    "createFixtureSourcePullAdapter",
    "browseSourceRows"
  ];

  for (const exportedName of requiredExports) {
    if (!barrel.includes(exportedName)) {
      fail(`Missing source archive barrel export: ${exportedName}`);
    }
    if (!rootIndex.includes(exportedName)) {
      fail(`Missing root library export: ${exportedName}`);
    }
  }
}

function run() {
  checkPackageScripts();
  checkRequiredFiles();
  checkNoOutOfPhaseSurfaces();
  checkSourceArchiveDoesNotCheat();
  checkActiveSourceArchiveTests();
  checkExports();

  if (failures.length > 0) {
    console.error("Phase 2 verification failed:");
    for (const failure of failures) {
      console.error(`FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log("Phase 2 verification passed.");
}

run();
