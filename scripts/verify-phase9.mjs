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

  if (pkg.scripts?.start !== "next start") {
    fail("package.json must define start as next start for Railway runtime.");
  }

  if (pkg.engines?.node !== "20.x") {
    fail("package.json must pin the Railway Node runtime to 20.x.");
  }
}

function checkRequiredFiles() {
  const requiredFiles = [
    "app/api/health/route.ts",
    "app/api/readiness/route.ts",
    "src/lib/launch/readiness.ts",
    "src/lib/launch/railway-target.ts",
    "tests/launch/launch-readiness.test.ts",
    "tests/launch/health-readiness-routes.test.ts",
    "tests/launch/railway-target.test.ts",
    "tests/launch/railway-build-config.test.ts",
    "tests/launch/phase9-verifier.test.ts",
    "railway.json",
    "scripts/launch-readiness-report.mjs",
    "scripts/lib/launch-readiness-report.mjs",
    "scripts/railway-readiness-report.mjs",
    "scripts/lib/railway-readiness-report.mjs"
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
    "tests/launch/railway-target.test.ts",
    "tests/launch/railway-build-config.test.ts",
    "railway.json",
    "scripts/launch-readiness-report.mjs",
    "scripts/lib/launch-readiness-report.mjs",
    "src/lib/launch/railway-target.ts",
    "scripts/railway-readiness-report.mjs",
    "scripts/lib/railway-readiness-report.mjs"
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
    "RAILWAY_TARGET_FORBIDDEN",
    "DATABASE_URL_REBUILD_SUPABASE",
    "PRODUCTION_DOMAIN_CUTOVER_UNAPPROVED",
    "RAILPACK",
    "next start",
    "/api/health",
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

function checkRailwayBuildConfig() {
  if (!exists("railway.json")) return;

  const config = JSON.parse(read("railway.json"));

  if (config.build?.builder !== "RAILPACK") {
    fail("railway.json must use Railpack rather than copied old Dockerfile config.");
  }

  if (config.build?.buildCommand !== "npm run build") {
    fail("railway.json buildCommand must keep using npm run build.");
  }

  if (config.deploy?.startCommand !== "npm run start") {
    fail("railway.json startCommand must use npm run start.");
  }

  if (config.deploy?.healthcheckPath !== "/api/health") {
    fail("railway.json must use /api/health as the deployment healthcheck.");
  }

  if (config.deploy?.preDeployCommand !== null) {
    fail("railway.json must not run pre-deploy commands in the launch gate.");
  }

  if (Object.prototype.hasOwnProperty.call(config.deploy ?? {}, "cronSchedule")) {
    fail("railway.json must not define cronSchedule before scheduled sync exists.");
  }
}

function run() {
  checkPackageScripts();
  checkRequiredFiles();
  checkLaunchReadinessMarkers();
  checkRailwayBuildConfig();

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
