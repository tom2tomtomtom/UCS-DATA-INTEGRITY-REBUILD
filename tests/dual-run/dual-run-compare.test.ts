import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";

import {
  compareDualRunSnapshots,
  type DualRunComparisonInput
} from "../../src/lib/dual-run/dual-run-compare";

const baseInput: DualRunComparisonInput = {
  scope: {
    office: "LDN",
    from: "2026-01-01",
    to: "2026-03-31",
    department: "Design"
  },
  sourceSnapshot: {
    label: "Redacted source snapshot",
    rows: [
      {
        id: "source:UCS04787",
        comparisonKey: "UCS04787",
        metric: "soldFee",
        value: 100,
        sourceRefs: [{ source: "fee_sheet", sourceLayer: "sold", rawRowId: "raw-source-1" }]
      },
      {
        id: "source:PCS00250",
        comparisonKey: "PCS00250",
        metric: "floatHours",
        value: 20,
        sourceRefs: [{ source: "float", sourceLayer: "float_cache", rawRowId: "raw-cache-1" }],
        warnings: ["cache_without_raw"]
      }
    ]
  },
  newDisplay: {
    label: "New display contract",
    rows: [
      {
        id: "new:UCS04787",
        comparisonKey: "UCS04787",
        metric: "soldFee",
        value: 100,
        sourceRefs: [{ source: "fee_sheet", sourceLayer: "sold", rawRowId: "raw-source-1" }]
      },
      {
        id: "new:PCS00250",
        comparisonKey: "PCS00250",
        metric: "floatHours",
        value: 20,
        sourceRefs: [{ source: "float", sourceLayer: "float_cache", rawRowId: "raw-cache-1" }],
        warnings: ["cache_without_raw"]
      }
    ]
  },
  oldDashboard: {
    label: "Old dashboard comparison export",
    comparisonOnly: true,
    rows: [
      {
        id: "old:UCS04787",
        comparisonKey: "UCS04787",
        metric: "soldFee",
        value: 95,
        sourceRefs: [{ source: "read_only_sql", sourceLayer: "read_only_sql", rawRowId: "old-row-1" }]
      },
      {
        id: "old:PCS00250",
        comparisonKey: "PCS00250",
        metric: "floatHours",
        value: 20,
        sourceRefs: [{ source: "read_only_sql", sourceLayer: "read_only_sql", rawRowId: "old-cache-1" }],
        warnings: ["cache_without_raw"]
      }
    ]
  }
};

describe("P8-D old vs new vs source comparator", () => {
  test("classifies old-only mismatch as old_bug when new display matches source", () => {
    const result = compareDualRunSnapshots(baseInput);

    expect(result.status).toBe("warn");
    expect(result.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "soldFee",
          classification: "old_bug",
          oldValue: 95,
          newValue: 100,
          sourceValue: 100
        })
      ])
    );
  });

  test("classifies new display drift as new_bug when old and source agree", () => {
    const result = compareDualRunSnapshots({
      ...baseInput,
      newDisplay: {
        ...baseInput.newDisplay,
        rows: [{ ...baseInput.newDisplay.rows[0]!, value: 105 }]
      },
      oldDashboard: {
        ...baseInput.oldDashboard,
        rows: [{ ...baseInput.oldDashboard.rows[0]!, value: 100 }]
      }
    });

    expect(result.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "soldFee",
          classification: "new_bug",
          oldValue: 100,
          newValue: 105,
          sourceValue: 100
        })
      ])
    );
  });

  test("keeps source warnings surfaced even when old dashboard also differs", () => {
    const result = compareDualRunSnapshots({
      ...baseInput,
      sourceSnapshot: {
        ...baseInput.sourceSnapshot,
        rows: [
          {
            id: "source:PCS00250",
            comparisonKey: "PCS00250",
            metric: "floatHours",
            value: 20,
            sourceRefs: [{ source: "float", sourceLayer: "float_cache", rawRowId: "raw-cache-1" }],
            warnings: ["cache_without_raw"]
          }
        ]
      },
      newDisplay: {
        ...baseInput.newDisplay,
        rows: [
          {
            id: "new:PCS00250",
            comparisonKey: "PCS00250",
            metric: "floatHours",
            value: 20,
            sourceRefs: [{ source: "float", sourceLayer: "float_cache", rawRowId: "raw-cache-1" }]
          }
        ]
      },
      oldDashboard: {
        ...baseInput.oldDashboard,
        rows: [
          {
            id: "old:PCS00250",
            comparisonKey: "PCS00250",
            metric: "floatHours",
            value: 18,
            sourceRefs: [{ source: "read_only_sql", sourceLayer: "read_only_sql", rawRowId: "old-cache-1" }]
          }
        ]
      }
    });

    expect(result.warnings).toContain("source_snapshot_has_open_warnings");
    expect(result.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          comparisonKey: "PCS00250",
          sourceWarnings: ["cache_without_raw"]
        })
      ])
    );
  });

  test("classifies hidden source rows as new_bug even when another row could offset totals", () => {
    const result = compareDualRunSnapshots({
      ...baseInput,
      sourceSnapshot: {
        ...baseInput.sourceSnapshot,
        rows: [
          ...baseInput.sourceSnapshot.rows,
          {
            id: "source:TBC",
            comparisonKey: "pipeline:TBC:row-88",
            metric: "pipelineFee",
            value: 50,
            sourceRefs: [{ source: "pipeline", sourceLayer: "pipeline", rawRowId: "raw-tbc-88" }]
          }
        ]
      },
      newDisplay: {
        ...baseInput.newDisplay,
        rows: []
      },
      oldDashboard: {
        ...baseInput.oldDashboard,
        rows: [
          ...baseInput.oldDashboard.rows,
          {
            id: "old:TBC",
            comparisonKey: "pipeline:TBC:row-88",
            metric: "pipelineFee",
            value: 50,
            sourceRefs: [{ source: "read_only_sql", sourceLayer: "read_only_sql", rawRowId: "old-tbc-88" }]
          }
        ]
      }
    });

    expect(result.status).toBe("fail");
    expect(result.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metric: "pipelineFee",
          comparisonKey: "pipeline:TBC:row-88",
          classification: "new_bug",
          message: expect.stringContaining("missing from the new display contract")
        })
      ])
    );
  });

  test("marks source conflict unresolved when all lanes disagree", () => {
    const result = compareDualRunSnapshots({
      ...baseInput,
      sourceSnapshot: {
        ...baseInput.sourceSnapshot,
        rows: [{ ...baseInput.sourceSnapshot.rows[0]!, value: 100 }]
      },
      newDisplay: {
        ...baseInput.newDisplay,
        rows: [{ ...baseInput.newDisplay.rows[0]!, value: 105 }]
      },
      oldDashboard: {
        ...baseInput.oldDashboard,
        rows: [{ ...baseInput.oldDashboard.rows[0]!, value: 95 }]
      }
    });

    expect(result.status).toBe("fail");
    expect(result.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classification: "unresolved",
          message: expect.stringContaining("all lanes disagree")
        })
      ])
    );
  });

  test("fails if old dashboard evidence is not explicitly comparison-only", () => {
    expect(() =>
      compareDualRunSnapshots({
        ...baseInput,
        oldDashboard: {
          ...baseInput.oldDashboard,
          comparisonOnly: false
        }
      })
    ).toThrow("Old dashboard lane must be comparison evidence only.");
  });

  test("fails when lane scope does not match the requested comparison scope", () => {
    expect(() =>
      compareDualRunSnapshots({
        ...baseInput,
        oldDashboard: {
          ...baseInput.oldDashboard,
          scope: {
            office: "LDN",
            from: "2026-01-01",
            to: "2026-12-31"
          }
        }
      })
    ).toThrow("Old dashboard lane scope must match the comparison scope.");
  });

  test("dry-run comparator script emits classified differences for the fixture", () => {
    const output = execFileSync(
      "node",
      ["scripts/dual-run-compare.mjs", "fixtures/dual-run/p8d-basic.json"],
      { encoding: "utf8" }
    );
    const report = JSON.parse(output) as {
      status: string;
      differences: Array<{ classification: string; metric: string }>;
    };

    expect(report.status).toBe("warn");
    expect(report.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metric: "soldFee", classification: "old_bug" }),
        expect.objectContaining({ metric: "floatHours", classification: "source_issue" })
      ])
    );
    expect(output).not.toContain("old selector truth");
    expect(output).not.toContain("raw-source-1");
    expect(output).not.toContain("sourceRefs");
  });
});
