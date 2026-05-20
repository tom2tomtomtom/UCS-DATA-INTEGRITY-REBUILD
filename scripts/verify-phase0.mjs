#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const failures = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
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
      if (relative.includes(`${path.sep}.git${path.sep}`)) continue;
      if (relative.startsWith(`node_modules${path.sep}`)) continue;
      if (relative.startsWith(`.next${path.sep}`)) continue;
      if (relative.startsWith(`coverage${path.sep}`)) continue;
      if (relative.startsWith(`supabase${path.sep}.temp${path.sep}`)) continue;
      if (entry.isDirectory()) {
        stack.push(full);
      } else {
        files.push(relative);
      }
    }
  }
  return files.sort();
}

function checkRequiredFiles() {
  const requiredFiles = [
    "OBJECTIVE.md",
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "docs/IMMUTABLE_LAWS.md",
    "docs/OVERNIGHT_BUILD_CONTROL.md",
    "docs/EXECUTION_TICKETS.md",
    "docs/BUILD_LOG.md",
    "docs/RED_ROOM_PREBUILD_REVIEW.md",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vitest.config.ts",
    ".github/workflows/ci.yml",
    "src/lib/canon/scope.ts",
    "src/lib/display/contract.ts",
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) fail(`Missing required Phase 0 file: ${file}`);
  }
}

function checkObjective() {
  if (!exists("OBJECTIVE.md")) return;
  const headings = read("OBJECTIVE.md").match(/^## /gm) ?? [];
  if (headings.length !== 5) {
    fail(`OBJECTIVE.md must contain exactly 5 second-level headings, found ${headings.length}`);
  }
}

function checkNoProductUi() {
  const bannedDirs = ["src/app", "src/pages", "src/components"];
  for (const dir of bannedDirs) {
    if (exists(dir)) fail(`Phase 0 must not create product UI directory: ${dir}`);
  }
}

function checkNoRemoteMigrations() {
  const migrationDir = path.join(root, "supabase/migrations");
  if (!fs.existsSync(migrationDir)) return;
  const migrations = fs.readdirSync(migrationDir).filter((name) => name.endsWith(".sql"));
  if (migrations.length > 0) {
    fail(`Phase 0 must not create remote migration files: ${migrations.join(", ")}`);
  }
}

function checkTestScaffold() {
  const lawTests = listFiles("tests/laws").filter((file) => file.endsWith(".test.ts"));
  const scenarioTests = listFiles("tests/scenarios").filter((file) => file.endsWith(".test.ts"));

  if (lawTests.length === 0) fail("Missing law test scaffold under tests/laws");
  if (scenarioTests.length === 0) fail("Missing named scenario test scaffold under tests/scenarios");

  const combined = [...lawTests, ...scenarioTests]
    .map((file) => read(file))
    .join("\n")
    .toLowerCase();
  const requiredNeedles = [
    "Every Real Source Row Surfaces",
    "Dashboard Spots Mistakes",
    "One Display Contract",
    "Scope Is Explicit",
    "Unsupported Is Not Zero",
    "Raw Rows Are Evidence",
    "Raw, Cache, And Visible",
    "LDN Q1 Design",
    "UCS04787",
    "UCS05186",
    "UCS04154",
    "PCS00250",
    "USA00262",
    "USA00323",
    "TBC pipeline",
    "exact client",
  ];

  for (const needle of requiredNeedles) {
    if (!combined.includes(needle.toLowerCase())) {
      fail(`Missing pending test coverage marker: ${needle}`);
    }
  }
}

function checkFixtureScaffold() {
  const fixtureFiles = listFiles("fixtures");
  if (fixtureFiles.length === 0) {
    fail("Missing fixture scaffold under fixtures");
    return;
  }

  const combined = fixtureFiles
    .map((file) => read(file))
    .join("\n")
    .toLowerCase();
  const requiredNeedles = [
    "LDN Q1 Design",
    "UCS04787",
    "UCS05186",
    "UCS04154",
    "PCS00250",
    "USA00262",
    "USA00323",
    "BT raw-without-cache",
    "TBC pipeline",
    "archived production revenue",
    "exact client",
  ];

  for (const needle of requiredNeedles) {
    if (!combined.includes(needle.toLowerCase())) {
      fail(`Missing fixture marker: ${needle}`);
    }
  }
}

function checkSecretLeak() {
  const visibleFiles = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((file) => !file.startsWith(".env"))
    .filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`))
    .filter((file) => !file.startsWith("supabase/.temp/"));

  const secretNeedles = [
    ["p98", "cMx"].join(""),
    ["eyJ", "hbGci"].join(""),
    ["sb_", "publishable_"].join(""),
    ["service", "_role"].join(""),
    ["YOUR", "-PASSWORD"].join(""),
  ];

  for (const file of visibleFiles) {
    const full = path.join(root, file);
    if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
    const content = fs.readFileSync(full, "utf8");
    if (secretNeedles.some((needle) => content.includes(needle))) {
      fail(`Potential secret committed in tracked file: ${file}`);
    }
  }
}

function checkGitIgnoreEnv() {
  if (!exists(".gitignore")) {
    fail("Missing .gitignore");
    return;
  }

  const gitignore = read(".gitignore");
  if (!gitignore.includes(".env.*")) {
    fail(".gitignore must ignore .env.* files");
  }

  if (!gitignore.includes("!.env.example")) {
    fail(".gitignore must allow .env.example");
  }
}

function run() {
  checkRequiredFiles();
  checkObjective();
  checkNoProductUi();
  checkNoRemoteMigrations();
  checkTestScaffold();
  checkFixtureScaffold();
  checkSecretLeak();
  checkGitIgnoreEnv();

  for (const warning of warnings) {
    console.warn(`PROCESS_WARN ${warning}`);
  }

  if (failures.length > 0) {
    console.error("Phase 0 verification failed:");
    for (const failure of failures) {
      console.error(`FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log("Phase 0 verification passed.");
}

run();
