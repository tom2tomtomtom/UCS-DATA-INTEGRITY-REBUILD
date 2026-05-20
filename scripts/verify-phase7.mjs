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

  if (pkg.scripts?.["verify:phase7"] !== "npm run test && npm run typecheck && next build && node scripts/verify-phase7.mjs") {
    fail("package.json must define verify:phase7 as test, typecheck, next build, then scripts/verify-phase7.mjs");
  }

  if (pkg.scripts?.build !== "npm run verify:phase7") {
    fail("package.json build must run verify:phase7 once chat route exists");
  }
}

function checkRequiredFiles() {
  const requiredFiles = [
    "app/api/chat/route.ts",
    "src/lib/chat/types.ts",
    "src/lib/chat/evidence.ts",
    "src/lib/chat/needs-codex.ts",
    "src/lib/chat/stream-events.ts",
    "src/lib/chat/playbooks.ts",
    "src/lib/chat/tactical-tools.ts",
    "src/lib/chat/orchestrator.ts",
    "src/lib/chat/claim-guard.ts",
    "src/lib/chat/reporter.ts",
    "src/lib/chat/index.ts",
    "src/components/dashboard/chat/chat-shell.ts",
    "src/components/dashboard/chat/chat-evidence-trace.ts",
    "tests/chat/evidence-pack.test.ts",
    "tests/chat/playbooks.test.ts",
    "tests/chat/orchestrator.test.ts",
    "tests/chat/claim-guard.test.ts",
    "tests/chat/chat-route.test.ts",
    "tests/chat/phase7-verifier.test.ts",
    "tests/laws/chat-evidence-boundary.test.ts",
    "tests/laws/chat-investigation-agent.test.ts"
  ];

  for (const file of requiredFiles) {
    if (!exists(file)) fail(`Missing Phase 7 chat file: ${file}`);
  }
}

function checkChatCodeDoesNotCheat() {
  const chatFiles = [
    ...listFiles("app/api/chat"),
    ...listFiles("src/lib/chat"),
    ...listFiles("src/components/dashboard/chat")
  ].filter((file) => /\.(ts|tsx)$/.test(file));
  const combined = chatFiles.map((file) => read(file)).join("\n");
  const forbiddenNeedles = [
    "@supabase",
    "createClient",
    "googleapis",
    "selectDashboardView",
    "getProjectsList",
    "getUnmatchedPipelineRows",
    "getOrphanFloatRows",
    "openai",
    "anthropic",
    "chat.completions",
    "generateText",
    "INSERT ",
    "UPDATE ",
    "DELETE "
  ];

  for (const needle of forbiddenNeedles) {
    if (combined.includes(needle)) {
      fail(`Phase 7 chat code contains forbidden out-of-phase reference: ${needle}`);
    }
  }

  const forbiddenPatterns = [
    ["archive tool execution", /\btool\s*:\s*["']archive["']/],
    ["sync tool execution", /\btool\s*:\s*["']sync["']/],
    ["deploy tool execution", /\btool\s*:\s*["']deploy["']/],
    ["fetch call", /\bfetch\s*\(/],
    ["write SQL tool", /\bwrite_sql\b/]
  ];

  for (const [label, pattern] of forbiddenPatterns) {
    if (pattern.test(combined)) {
      fail(`Phase 7 chat code contains forbidden ${label}`);
    }
  }
}

function checkMarkers() {
  const combined = [
    read("app/api/chat/route.ts"),
    read("src/lib/chat/types.ts"),
    read("src/lib/chat/evidence.ts"),
    read("src/lib/chat/playbooks.ts"),
    read("src/lib/chat/tactical-tools.ts"),
    read("src/lib/chat/orchestrator.ts"),
    read("src/lib/chat/claim-guard.ts"),
    read("src/lib/chat/reporter.ts"),
    read("src/components/dashboard/chat/chat-shell.ts"),
    read("src/components/dashboard/chat/chat-evidence-trace.ts"),
    read("tests/chat/evidence-pack.test.ts"),
    read("tests/chat/playbooks.test.ts"),
    read("tests/chat/orchestrator.test.ts"),
    read("tests/chat/claim-guard.test.ts"),
    read("tests/chat/chat-route.test.ts"),
    read("tests/laws/chat-evidence-boundary.test.ts"),
    read("tests/laws/chat-investigation-agent.test.ts")
  ].join("\n");
  const requiredMarkers = [
    "EvidencePack",
    "createEvidencePack",
    "recordToolError",
    "NeedsCodexDecision",
    "routePlaybook",
    "requiredTools",
    "forbiddenClaims",
    "executeReadOnlyTool",
    "listReadOnlyToolNames",
    "runInvestigation",
    "validateEvidenceClaims",
    "generateEvidenceReport",
    "text/event-stream",
    "tool_start",
    "tool_result",
    "evidence",
    "needs_codex",
    "MISSING_FLOAT_EXPORT",
    "zero_hours_when_source_or_contract_nonzero",
    "dashboard_bug_without_failed_check",
    "float_mismatch_without_all_layers",
    "raw_parser_total_without_additive_proof",
    "high_confidence_with_missing_required_evidence",
    "TOOL_NOT_FIXTURE_BACKED",
    "report.guard.status",
    "Unresolved checks",
    "Needs Codex",
    "archive",
    "sync",
    "deploy"
  ];

  for (const marker of requiredMarkers) {
    if (!combined.includes(marker)) {
      fail(`Missing Phase 7 chat marker: ${marker}`);
    }
  }
}

function run() {
  checkPackageScripts();
  checkRequiredFiles();
  checkChatCodeDoesNotCheat();
  checkMarkers();

  if (failures.length > 0) {
    console.error("Phase 7 verification failed:");
    for (const failure of failures) {
      console.error(`FAIL ${failure}`);
    }
    process.exit(1);
  }

  console.log("Phase 7 verification passed.");
}

run();
