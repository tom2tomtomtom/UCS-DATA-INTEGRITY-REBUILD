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

function checkPackageScripts() {
  const pkg = JSON.parse(read("package.json"));

  if (pkg.scripts?.build !== "npm run verify:phase8") {
    fail("package.json build must keep running verify:phase8 until launch gates are complete.");
  }

  if (pkg.scripts?.["verify:phase9"] !== "npm run build && node scripts/verify-phase9.mjs") {
    fail("package.json must define verify:phase9 as build plus scripts/verify-phase9.mjs.");
  }
}

function checkRequiredFiles() {
  const requiredFiles = [
    "app/api/health/route.ts",
    "app/api/readiness/route.ts",
    "src/lib/launch/readiness.ts",
    "tests/launch/launch-readiness.test.ts",
    "tests/launch/health-readiness-routes.test.ts",
    "tests/launch/phase9-verifier.test.ts",
    "scripts/launch-readiness-report.mjs",
    "scripts/lib/launch-readiness-report.mjs"
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) fail(`Missing Phase 9 launch readiness file: ${file}`);
  }
}

function checkLaunchReadinessMarkers() {
  const files = [
    "app/api/health/route.ts",
    "app/api/readiness/route.ts",
    "src/lib/launch/readiness.ts",
    "tests/launch/launch-readiness.test.ts",
    "tests/launch/health-readiness-routes.test.ts",
    "scripts/launch-readiness-report.mjs",
    "scripts/lib/launch-readiness-report.mjs"
  ];

  if (!files.every(exists)) return;

  const combined = files.map(read).join("\n");
  const requiredMarkers = [
    "BUILD_GATES_PHASE8",
    "VERIFY_PHASE9_SCRIPT",
    "HEALTH_ROUTE_MISSING",
    "READINESS_ROUTE_MISSING",
    "DATABASE_URL_NEW_SUPABASE",
    "MUTATION_GUARD_READ_ONLY",
    "FORBIDDEN_SCRIPT_DEPLOY",
    "FORBIDDEN_SCRIPT_SYNC",
    "RAILWAY_MUTATION_ALREADY_RUN",
    "NO_RAILWAY_MUTATION",
    "railway up",
    "supabase db push"
  ];

  for (const marker of requiredMarkers) {
    if (!combined.includes(marker)) {
      fail(`Missing Phase 9 launch readiness marker: ${marker}`);
    }
  }
}

function run() {
  checkPackageScripts();
  checkRequiredFiles();
  checkLaunchReadinessMarkers();

  if (failures.length > 0) {
    console.error("Phase 9 verification failed:");
    for (const failure of failures) {
      console.error(`FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log("Phase 9 verification passed.");
}

run();
