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

  if (pkg.scripts?.["verify:phase4"] !== "npm run test && npm run typecheck && node scripts/verify-phase4.mjs") {
    fail("package.json must define verify:phase4 as test, typecheck, then scripts/verify-phase4.mjs");
  }

  if (pkg.scripts?.build !== "npm run verify:phase4") {
    fail("package.json build must run verify:phase4 once canon query behaviours exist");
  }
}

function checkRequiredFiles() {
  const requiredFiles = [
    "src/lib/canon-queries/types.ts",
    "src/lib/canon-queries/scope.ts",
    "src/lib/canon-queries/index.ts",
    "tests/canon-queries/query-contracts.test.ts",
    "tests/canon-queries/scope-predicate.test.ts"
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) fail(`Missing required Phase 4 canon query file: ${file}`);
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
    if (exists(dir)) fail(`Phase 4 must not create out-of-phase directory: ${dir}`);
  }

  if (exists("supabase/migrations")) {
    const migrationFiles = listFiles("supabase/migrations").filter((file) => file.endsWith(".sql"));
    if (migrationFiles.length > 0) {
      fail(`Phase 4 must not apply or stage migration SQL: ${migrationFiles.join(", ")}`);
    }
  }
}

function checkCanonQueriesDoNotCheat() {
  const queryFiles = listFiles("src/lib/canon-queries").filter((file) => file.endsWith(".ts"));
  const combined = queryFiles.map((file) => read(file)).join("\n");

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
    "buildDashboardDisplayContract",
    "displayRows",
    "visibleRows",
    "csvRows",
    "dashboardRows",
    "selectDashboardView",
    "INSERT ",
    "UPDATE ",
    "DELETE "
  ];

  for (const needle of forbiddenNeedles) {
    if (combined.includes(needle)) {
      fail(`Phase 4 canon query code contains forbidden out-of-phase reference: ${needle}`);
    }
  }

  const forbiddenPatterns = [
    ["globalThis.fetch call", /\bglobalThis\.fetch\s*\(/],
    ["window.fetch call", /\bwindow\.fetch\s*\(/],
    ["await fetch call", /\bawait\s+fetch\s*\(/],
    ["return fetch call", /\breturn\s+fetch\s*\(/],
    ["assigned fetch call", /=\s*fetch\s*\(/],
    ["literal URL fetch call", /\bfetch\s*\(\s*["'`]/],
    ["array reduce aggregation", /\.reduce\s*\(/],
    ["money accumulator", /amountGbp\s*[+\-*/]?=/],
    ["hour accumulator", /hours\s*[+\-*/]?=/]
  ];

  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(combined)) {
      fail(`Phase 4 canon query code contains forbidden ${label}`);
    }
  }
}

function checkActiveCanonQueryTests() {
  const testFiles = listFiles("tests/canon-queries").filter((file) => file.endsWith(".test.ts"));
  if (testFiles.length < 2) {
    fail(`Expected at least 2 active canon query test files, found ${testFiles.length}`);
  }

  const combined = testFiles.map((file) => read(file)).join("\n");
  const activeTests = combined.match(/\btest\(/g) ?? [];
  if (activeTests.length < 5) {
    fail(`Expected at least 5 active canon query tests, found ${activeTests.length}`);
  }

  const requiredMarkers = [
    "Unsupported",
    "exact client",
    "fuzzy search",
    "displayRows",
    "visibleRows",
    "csvRows",
    "dashboardRows",
    "unsupported source capability"
  ];

  for (const marker of requiredMarkers) {
    if (!combined.includes(marker)) {
      fail(`Missing Phase 4 canon query test coverage marker: ${marker}`);
    }
  }
}

function checkExports() {
  const rootIndex = read("src/lib/index.ts");
  const queryIndex = read("src/lib/canon-queries/index.ts");
  const requiredExports = [
    "createCanonQueryResult",
    "createUnsupportedScopeMetrics",
    "factMatchesScope",
    "filterFactsByScope"
  ];

  for (const exportedName of requiredExports) {
    if (!queryIndex.includes(exportedName)) {
      fail(`Missing canon query barrel export: ${exportedName}`);
    }
    if (!rootIndex.includes(exportedName)) {
      fail(`Missing root canon query export: ${exportedName}`);
    }
  }
}

function run() {
  checkPackageScripts();
  checkRequiredFiles();
  checkNoOutOfPhaseSurfaces();
  checkCanonQueriesDoNotCheat();
  checkActiveCanonQueryTests();
  checkExports();

  if (failures.length > 0) {
    console.error("Phase 4 verification failed:");
    for (const failure of failures) {
      console.error(`FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log("Phase 4 verification passed.");
}

run();
