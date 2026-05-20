import { describe, expect, test } from "vitest";

import { createEvidencePack, generateEvidenceReport, runInvestigation, validateEvidenceClaims } from "../../src/lib/chat";
import type { DashboardScope } from "../../src/lib";

const scope: DashboardScope = {
  office: "LDN",
  from: "2026-01-01",
  to: "2026-03-31"
};

describe("P7-D claim guard and evidence-only reporter", () => {
  test("blocks zero-hours claims when evidence carries nonzero hours", () => {
    const pack = createEvidencePack({
      question: "does USA00262 have zero sold hours?",
      scope,
      playbook: "fee_sheet_sold_hours_mismatch",
      facts: [
        {
          id: "fact:usa00262:sold-hours",
          label: "USA00262 sold hours",
          sourceLayer: "sold",
          value: { kind: "hours", value: 14_333, unit: "decimal_hours" },
          sourceRefs: [{ source: "fee_sheet", sourceLayer: "sold", rawRowId: "fixture-usa00262-sold" }]
        }
      ]
    });

    const result = validateEvidenceClaims(pack, "USA00262 has zero sold hours in the dashboard.");

    expect(result.status).toBe("blocked");
    expect(result.blockedClaims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "zero_hours_when_source_or_contract_nonzero"
        })
      ])
    );
  });

  test("blocks dashboard-bug claims without failed evidence checks", () => {
    const pack = createEvidencePack({
      question: "what errors can you see?",
      scope,
      playbook: "dashboard_scan",
      checks: [
        {
          id: "check:warn",
          label: "PCS cache warning",
          status: "warn",
          sourceLayers: ["float_cache"],
          message: "Cache-only Float hours need review."
        }
      ]
    });

    const result = validateEvidenceClaims(pack, "This is definitely a dashboard bug.");

    expect(result.status).toBe("blocked");
    expect(result.blockedClaims).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "dashboard_bug_without_failed_check" })])
    );
  });

  test("reports unresolved Float export evidence instead of confirmed mismatch certainty", () => {
    const pack = runInvestigation({
      question: "is UCS04787 a dashboard problem or Float source mismatch?",
      scope,
      jobNumber: "UCS04787"
    });

    const report = generateEvidenceReport(pack);

    expect(report.guard.status).toBe("pass");
    expect(report.text).toContain("Unresolved");
    expect(report.text).toContain("MISSING_FLOAT_EXPORT");
    expect(report.text).toContain("Needs Codex");
    expect(report.text).not.toContain("dashboard bug");
    expect(report.text).not.toContain("confirmed Float mismatch");
  });

  test("surfaces tool errors in final reporter text", () => {
    const pack = runInvestigation({
      question: "check against Google sheets",
      scope,
      simulateToolErrors: {
        inspect_fee_sheet: "Fee sheet fixture is unavailable."
      }
    });

    const report = generateEvidenceReport(pack);

    expect(report.text).toContain("inspect_fee_sheet failed: Fee sheet fixture is unavailable.");
    expect(report.text).toContain("Needs Codex");
    expect(report.guard.status).toBe("pass");
  });
});
