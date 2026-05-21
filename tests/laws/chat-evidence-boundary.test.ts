import { describe, expect, test } from "vitest";

import { createEvidencePack, generateEvidenceReport, runInvestigation, validateEvidenceClaims } from "../../src/lib/chat";
import type { DashboardScope } from "../../src/lib";

const scope: DashboardScope = {
  office: "LDN",
  from: "2026-01-01",
  to: "2026-03-31"
};

describe("Law 9: chat is read-only evidence reporting", () => {
  test.todo("does not answer from a bad pasted transcript as product truth");

  test("guards against USA sold-hours false-zero claims", () => {
    const pack = createEvidencePack({
      question: "does USA00262 have zero sold hours?",
      scope,
      playbook: "fee_sheet_sold_hours_mismatch",
      facts: [
        {
          id: "fact:usa:sold-hours",
          label: "USA sold hours",
          sourceLayer: "sold",
          value: { kind: "hours", value: 1, unit: "decimal_hours" },
          sourceRefs: [{ source: "fee_sheet", sourceLayer: "sold" }]
        }
      ]
    });

    expect(validateEvidenceClaims(pack, "zero sold hours").status).toBe("blocked");
  });

  test.todo("reports PCS stale-cache warnings instead of unsupported certainty");

  test("incomplete Float evidence returns Needs Codex instead of a fake dashboard-error conclusion", () => {
    const pack = runInvestigation({
      question: "is UCS04787 a dashboard problem or Float source mismatch?",
      scope,
      jobNumber: "UCS04787"
    });
    const report = generateEvidenceReport(pack);

    expect(pack.needsCodex).toMatchObject({
      needed: true,
      triggers: expect.arrayContaining(["incomplete_evidence"])
    });
    expect(pack.unresolved.map((check) => check.code)).toEqual(
      expect.arrayContaining(["MISSING_FLOAT_EXPORT", "FLOAT_EXPORT_COMPARISON_UNRESOLVED"])
    );
    expect(report.text).toContain("Needs Codex");
    expect(report.text).toContain("MISSING_FLOAT_EXPORT");
    expect(report.text).toContain("861 decimal_hours");
    expect(report.text).toContain("1597.5 decimal_hours");
    expect(report.text).not.toMatch(/dashboard (bug|error)/i);
    expect(report.text).not.toContain("4866.8");
    expect(validateEvidenceClaims(pack, "This is a dashboard error.").status).toBe("blocked");
  });

  test("explains that chat is read-only and cannot sync, archive, deploy, or mutate", () => {
    const pack = runInvestigation({
      question: "Can you sync Float, archive the project, deploy, or mutate source systems?",
      scope
    });
    const report = generateEvidenceReport(pack);

    expect(pack.playbook).toBe("needs_codex_handoff");
    expect(pack.needsCodex.triggers).toEqual(expect.arrayContaining(["sync", "mutation", "deploy"]));
    expect(report.text).toContain("Needs Codex");
    expect(report.text).toContain("Chat can do:");
    expect(report.text).toContain("explain the current EvidencePack");
    expect(report.text).toContain("Chat cannot do:");
    expect(report.text).toContain("sync source systems");
    expect(report.text).toContain("archive projects");
    expect(report.text).toContain("deploy");
    expect(report.text).toContain("mutate source data");
  });

  test("turns tool errors into visible evidence warnings", () => {
    const pack = runInvestigation({
      question: "check against Google sheets",
      scope,
      simulateToolErrors: {
        inspect_fee_sheet: "Fee sheet fixture unavailable."
      }
    });

    expect(pack.warnings).toContain("inspect_fee_sheet failed: Fee sheet fixture unavailable.");
    expect(pack.unresolved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "TOOL_ERROR",
          requiredTool: "inspect_fee_sheet"
        })
      ])
    );
    expect(generateEvidenceReport(pack).text).toContain("TOOL_ERROR");
    expect(generateEvidenceReport(pack).text).toContain("inspect_fee_sheet failed: Fee sheet fixture unavailable.");
  });

  test("requires serial evidence checks before final claims", () => {
    const pack = runInvestigation({
      question: "is UCS04787 a dashboard problem or Float source mismatch?",
      scope,
      jobNumber: "UCS04787"
    });

    expect(pack.toolsRun.map((run) => run.tool)).toEqual([
      "get_display_contract",
      "inspect_project",
      "inspect_float_raw_cache_visible",
      "parse_pasted_float_export",
      "compare_float_export_to_contract"
    ]);
    expect(pack.unresolved.map((check) => check.code)).toContain("MISSING_FLOAT_EXPORT");
  });

  test("hands off with Needs Codex when code, browser, mutation, deploy, or stakeholder work is required", () => {
    const pack = runInvestigation({
      question: "deploy the fix and email Sian",
      scope
    });

    expect(pack.needsCodex.needed).toBe(true);
    expect(pack.needsCodex.triggers).toEqual(expect.arrayContaining(["deploy", "stakeholder"]));
  });
});
