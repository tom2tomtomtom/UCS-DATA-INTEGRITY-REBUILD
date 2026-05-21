import { describe, expect, test } from "vitest";

import type { DashboardScope, FloatFact } from "../../src/lib/canon/types";
import { createFloatReconciliationChecks } from "../../src/lib/display/float-reconciliation";

const scope: DashboardScope = {
  office: "LDN",
  from: "2026-03-01",
  to: "2026-03-31"
};

function floatFact(input: {
  readonly id: string;
  readonly sourceLayer: FloatFact["sourceLayer"];
  readonly hours: number;
  readonly jobNumber: string;
  readonly client?: string;
}): FloatFact {
  return {
    id: input.id,
    source: "float",
    sourceLayer: input.sourceLayer,
    rawRowIds: [`raw-${input.id}`],
    batchId: `batch-${input.sourceLayer}`,
    jobNumber: input.jobNumber,
    ...(input.client === undefined ? {} : { client: input.client }),
    office: "LDN",
    month: "2026-03",
    hours: {
      kind: "hours",
      value: input.hours,
      unit: "decimal_hours"
    },
    activeState: "active",
    isAdditive: true,
    confidence: "high",
    warnings: [],
    trace: [
      {
        source: "float",
        sourceLayer: input.sourceLayer,
        batchId: `batch-${input.sourceLayer}`,
        rawRowId: `raw-${input.id}`,
        field: "hours"
      }
    ]
  };
}

describe("Law 7: raw, cache, and visible must reconcile or warn", () => {
  test("classifies BT raw-only evidence as FAIL and PCS00250 cache-only evidence as WARN", () => {
    const checks = createFloatReconciliationChecks({
      scope,
      facts: [
        floatFact({
          id: "bt-raw",
          sourceLayer: "float_raw",
          hours: 12,
          jobNumber: "BT_RAW_CACHE",
          client: "BT Group"
        }),
        floatFact({
          id: "pcs-cache",
          sourceLayer: "float_cache",
          hours: 20,
          jobNumber: "PCS00250"
        })
      ]
    });

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BT_RAW_CACHE_UNRESOLVED",
          status: "FAIL",
          expected: expect.objectContaining({ kind: "hours", value: 12 }),
          actual: expect.objectContaining({ kind: "hours", value: 0 })
        }),
        expect.objectContaining({
          code: "PCS00250_RAW_CACHE_UNRESOLVED",
          status: "PROCESS_WARN",
          expected: expect.objectContaining({ kind: "hours", value: 0 }),
          actual: expect.objectContaining({ kind: "hours", value: 20 }),
          message: expect.stringContaining("raw source cannot currently prove it")
        })
      ])
    );
    expect(checks.some((check) => check.status === "PASS")).toBe(false);
  });
  test.todo("classifies raw/cache non-trivial deltas as at least WARN");
  test.todo("classifies inactive Float hours contributing visibly as FAIL");
  test.todo("preserves multi-person Float task split evidence");
  test.todo("keeps UCS04787 raw, cache, visible, and export layers separately inspectable");
});
