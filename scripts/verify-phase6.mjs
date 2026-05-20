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

  if (pkg.scripts?.["verify:phase6"] !== "npm run test && npm run typecheck && next build && node scripts/verify-phase6.mjs") {
    fail("package.json must define verify:phase6 as test, typecheck, next build, then scripts/verify-phase6.mjs");
  }

  if (pkg.scripts?.build !== "npm run verify:phase6") {
    fail("package.json build must run verify:phase6 once UI shell exists");
  }
}

function checkRequiredShellFiles() {
  const requiredFiles = [
    "next.config.ts",
    "next-env.d.ts",
    "app/layout.tsx",
    "app/page.tsx",
    "app/dashboard/layout.tsx",
    "app/dashboard/page.tsx",
    "app/dashboard/projects/page.tsx",
    "app/dashboard/projects/[jobNumber]/page.tsx",
    "app/dashboard/float/page.tsx",
    "app/dashboard/float/[floatProjectId]/page.tsx",
    "app/dashboard/data-quality/page.tsx",
    "app/dashboard/approval/page.tsx",
    "app/dashboard/glossary/page.tsx",
    "app/dashboard/chat-demo/page.tsx",
    "app/globals.css",
    "src/lib/ui/scope-params.ts",
    "src/components/dashboard/chrome/dashboard-chrome.ts",
    "src/components/dashboard/rollups/dashboard-home.ts",
    "src/components/dashboard/projects/projects-table.ts",
    "src/components/dashboard/project-detail/project-detail.ts",
    "src/components/dashboard/float/float-diagnostics.ts",
    "src/components/dashboard/data-quality/data-quality-dashboard.ts",
    "src/components/dashboard/approval/approval-dashboard.ts",
    "src/components/dashboard/chat/chat-shell.ts",
    "src/components/dashboard/export/csv-export.ts",
    "src/lib/ui/fixture-contract.ts",
    "tests/ui/app-shell.test.ts",
    "tests/ui/dashboard-home.test.ts",
    "tests/ui/projects-page.test.ts",
    "tests/ui/csv-export.test.ts",
    "tests/ui/project-detail.test.ts",
    "tests/ui/float-diagnostics.test.ts",
    "tests/ui/data-quality.test.ts",
    "tests/ui/approval.test.ts",
    "tests/ui/chat-shell.test.ts",
    "tests/ui/scope-params.test.ts"
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) fail(`Missing Phase 6 shell file: ${file}`);
  }
}

function checkUiCodeDoesNotCheat() {
  const uiFiles = [
    ...listFiles("app"),
    ...listFiles("src/components"),
    ...listFiles("src/lib/ui")
  ].filter((file) => /\.(ts|tsx|css)$/.test(file));
  const combined = uiFiles.map((file) => read(file)).join("\n");
  const forbiddenNeedles = [
    "googleapis",
    "@supabase",
    "createClient",
    "node:http",
    "node:https",
    "axios",
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
      fail(`Phase 6 UI code contains forbidden out-of-phase reference: ${needle}`);
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
      fail(`Phase 6 UI code contains forbidden ${label}`);
    }
  }
}

function checkShellMarkers() {
  const combined = [
    read("src/components/dashboard/chrome/dashboard-chrome.ts"),
    read("src/components/dashboard/rollups/dashboard-home.ts"),
    read("src/components/dashboard/projects/projects-table.ts"),
    read("src/components/dashboard/project-detail/project-detail.ts"),
    read("src/components/dashboard/float/float-diagnostics.ts"),
    read("src/components/dashboard/data-quality/data-quality-dashboard.ts"),
    read("src/components/dashboard/approval/approval-dashboard.ts"),
    read("src/components/dashboard/chat/chat-shell.ts"),
    read("src/components/dashboard/export/csv-export.ts"),
    read("src/lib/ui/scope-params.ts"),
    read("src/lib/ui/fixture-contract.ts"),
    read("tests/ui/app-shell.test.ts"),
    read("tests/ui/dashboard-home.test.ts"),
    read("tests/ui/projects-page.test.ts"),
    read("tests/ui/csv-export.test.ts"),
    read("tests/ui/project-detail.test.ts"),
    read("tests/ui/float-diagnostics.test.ts"),
    read("tests/ui/data-quality.test.ts"),
    read("tests/ui/approval.test.ts"),
    read("tests/ui/chat-shell.test.ts"),
    read("tests/ui/scope-params.test.ts"),
    read("app/dashboard/projects/page.tsx"),
    read("app/dashboard/projects/[jobNumber]/page.tsx"),
    read("app/dashboard/float/page.tsx"),
    read("app/dashboard/float/[floatProjectId]/page.tsx"),
    read("app/dashboard/data-quality/page.tsx"),
    read("app/dashboard/approval/page.tsx"),
    read("app/dashboard/glossary/page.tsx"),
    read("app/dashboard/chat-demo/page.tsx"),
    read("app/dashboard/page.tsx")
  ].join("\n");
  const requiredMarkers = [
    "DashboardChrome",
    "getFixtureDashboardContract",
    "buildDashboardDisplayContract",
    "display contract",
    "office",
    "from",
    "to",
    "Ask AI",
    "Department Rollup",
    "Projects",
    "Float",
    "DashboardHome",
    "contract.heroTotals",
    "contract.rollups",
    "LDN",
    "2026-01-01",
    "2026-03-31",
    "Unsupported",
    "Confidence",
    "ProjectsTable",
    "contract.visibleRows",
    "contract.footerTotals",
    "contract.csvRows",
    "pipeline_only",
    "production_revenue_only",
    "float_only",
    "Download CSV",
    "client",
    "search",
    "ProjectDetail",
    "FloatDiagnostics",
    "FLOAT_VISIBLE_CACHE_MISSING_CACHE",
    "PCS00250_RAW_CACHE_UNRESOLVED",
    "BT_RAW_CACHE_UNRESOLVED",
    "UCS04787",
    "UCS05186",
    "manual-ucs05186",
    "fixture-float-visible-ucs04787",
    "DataQualityDashboard",
    "ApprovalDashboard",
    "buildApprovalOutputFromDisplayContract",
    "UNRESOLVED",
    "USA00262",
    "USA00323",
    "source-only rows remain visible",
    "unsupported is not zero",
    "Needs Codex",
    "ChatShell",
    "sourcesChecked",
    "working",
    "repo inspection",
    "browser testing",
    "deployment",
    "scopeFromSearchParams",
    "searchParams",
    "floatProjectId",
    "jobNumber"
  ];

  for (const marker of requiredMarkers) {
    if (!combined.includes(marker)) {
      fail(`Missing Phase 6 shell marker: ${marker}`);
    }
  }
}

function run() {
  checkPackageScripts();
  checkRequiredShellFiles();
  checkUiCodeDoesNotCheat();
  checkShellMarkers();

  if (failures.length > 0) {
    console.error("Phase 6 verification failed:");
    for (const failure of failures) {
      console.error(`FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log("Phase 6 verification passed.");
}

run();
