import fs from "node:fs";

import { describe, expect, test } from "vitest";

const specPath = "docs/phase-9-5/legacy-ui-ux-spec.md";
const checklistPath = "docs/phase-9-5/ui-parity-acceptance-checklist.md";

describe("Phase 9.5 legacy UI parity spec", () => {
  test("captures the approved global chrome, route set, and core pages", () => {
    const spec = fs.readFileSync(specPath, "utf8");

    for (const marker of [
      "two rows",
      "OFFICE",
      "`All`, `LDN`, `UCX`, `USA`",
      "`Clear all filters`",
      "`Sync Now`",
      "`Ask AI`",
      "Department Rollup",
      "/dashboard/projects",
      "/dashboard/float",
      "/dashboard/approval",
      "/dashboard/data-quality",
      "/dashboard/audit",
      "/dashboard/admin/sync-warnings",
      "/dashboard/admin/timeoffs",
      "/dashboard/users"
    ]) {
      expect(spec).toContain(marker);
    }
  });

  test("locks the three stakeholder surfaces and their table contracts", () => {
    const spec = fs.readFileSync(specPath, "utf8");

    for (const marker of [
      "Sold vs Allocated",
      "Sheet Health",
      "TOTAL SOLD",
      "FLOAT SYNC WARNINGS",
      "Why is this lower than Float?",
      "SOLD (FEE SHEET)",
      "VARIANCE (HRS)",
      "Profitability by Role",
      "Float Trace",
      "FLOAT PROJECT",
      "TASK",
      "PERSON"
    ]) {
      expect(spec).toContain(marker);
    }
  });

  test("keeps immutable data laws stronger than visual parity", () => {
    const spec = fs.readFileSync(specPath, "utf8");
    const checklist = fs.readFileSync(checklistPath, "utf8");

    for (const marker of [
      "the data law wins",
      "old selector output as truth",
      "unsupported values rendered as zero",
      "Recognisable UX is the target",
      "without reducing functionality",
      "Data-access granularity is part of the UX",
      "reduced data-access granularity",
      "source-warning rows still surface",
      "exact params, not fuzzy search",
      "page-local business calculation is a fail",
      "hidden source rows are a fail"
    ]) {
      expect(`${spec}\n${checklist}`).toContain(marker);
    }
  });

  test("captures stakeholder workflows, combined office semantics, and secondary states", () => {
    const spec = fs.readFileSync(specPath, "utf8");
    const checklist = fs.readFileSync(checklistPath, "utf8");
    const combined = `${spec}\n${checklist}`;

    for (const marker of [
      "offices=LDN,UCX",
      "Sian LDN Q1 Design",
      "Yunni Float Warning To Trace",
      "Jade Pipeline TBC",
      "Calendar empty state includes the Breakdown section",
      "Add filter exposes only display-contract-backed fields",
      "rollup CSV equals visible rows",
      "Projects default sort is `SOLD (FEE SHEET)` descending",
      "chat working/progress signal exists",
      "`Needs Codex` handoff",
      "docs/UI_SCREENSHOT_REFERENCE_PLAN.md",
      "Sync Now and archive actions must be disabled"
    ]) {
      expect(combined).toContain(marker);
    }
  });
});
