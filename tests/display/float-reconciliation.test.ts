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
  readonly jobNumber?: string;
  readonly floatProjectId?: string;
  readonly client?: string;
  readonly projectName?: string;
  readonly activeState?: FloatFact["activeState"];
  readonly person?: string;
  readonly personId?: string;
  readonly allocationClass?: FloatFact["allocationClass"];
  readonly expansionRule?: string;
  readonly office?: FloatFact["office"];
  readonly month?: string;
}): FloatFact {
  return {
    id: input.id,
    source: "float",
    sourceLayer: input.sourceLayer,
    rawRowIds: [`raw-${input.id}`],
    batchId: `batch-${input.sourceLayer}`,
    ...(input.jobNumber !== undefined ? { jobNumber: input.jobNumber } : {}),
    ...(input.floatProjectId !== undefined ? { floatProjectId: input.floatProjectId } : {}),
    ...(input.client !== undefined ? { client: input.client } : {}),
    ...(input.projectName !== undefined ? { projectName: input.projectName } : {}),
    office: input.office ?? "LDN",
    month: input.month ?? "2026-03",
    activeState: input.activeState ?? "active",
    ...(input.person !== undefined ? { person: input.person } : {}),
    ...(input.personId !== undefined ? { personId: input.personId } : {}),
    ...(input.allocationClass !== undefined ? { allocationClass: input.allocationClass } : {}),
    ...(input.expansionRule !== undefined ? { expansionRule: input.expansionRule } : {}),
    hours: {
      kind: "hours",
      value: input.hours,
      unit: "decimal_hours"
    },
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

describe("P5-D Float raw/cache/visible reconciliation", () => {
  test("fails raw and visible hours that have no cache backing", () => {
    const raw = floatFact({
      id: "bt-raw",
      sourceLayer: "float_raw",
      hours: 8,
      jobNumber: "BT_RAW_CACHE",
      client: "BT Group"
    });
    const visible = floatFact({
      id: "visible-no-cache",
      sourceLayer: "float_visible",
      hours: 5,
      jobNumber: "UCS_VISIBLE_ONLY"
    });

    const checks = createFloatReconciliationChecks({ scope, facts: [raw, visible] });

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BT_RAW_CACHE_UNRESOLVED",
          status: "FAIL",
          expected: expect.objectContaining({ kind: "hours", value: 8 }),
          actual: expect.objectContaining({ kind: "hours", value: 0 })
        }),
        expect.objectContaining({
          code: "FLOAT_VISIBLE_CACHE_MISSING_CACHE",
          status: "FAIL",
          expected: expect.objectContaining({ kind: "hours", value: 0 }),
          actual: expect.objectContaining({ kind: "hours", value: 5 })
        })
      ])
    );
    expect(checks.some((check) => check.status === "PASS")).toBe(false);
  });

  test("keeps BT raw-only and PCS00250 cache-only as separate named checks instead of cancelling aggregates", () => {
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
          hours: 12,
          jobNumber: "PCS00250",
          projectName: "PCS00250 cache-only allocation"
        })
      ]
    });

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "BT_RAW_CACHE_UNRESOLVED",
          status: "FAIL"
        }),
        expect.objectContaining({
          code: "PCS00250_RAW_CACHE_UNRESOLVED",
          status: "PROCESS_WARN",
          message: expect.stringContaining("cache-only")
        })
      ])
    );
    expect(
      checks.find((check) => check.code === "PCS00250_RAW_CACHE_UNRESOLVED")?.message
    ).toContain("raw source cannot currently prove it");
    expect(checks.some((check) => check.status === "PASS")).toBe(false);
  });

  test("warns when raw and cache hours differ beyond tolerance without overwriting raw facts", () => {
    const raw = floatFact({
      id: "delta-raw",
      sourceLayer: "float_raw",
      hours: 10,
      jobNumber: "UCS_DELTA",
      expansionRule: "raw_task_span"
    });
    const cache = floatFact({
      id: "delta-cache",
      sourceLayer: "float_cache",
      hours: 8,
      jobNumber: "UCS_DELTA",
      expansionRule: "monthly_expanded_allocation"
    });

    const checks = createFloatReconciliationChecks({ scope, facts: [raw, cache] });
    const delta = checks.find((check) => check.code === "FLOAT_RAW_CACHE_DELTA");

    expect(delta).toMatchObject({
      status: "DATA_WARN",
      expected: { kind: "hours", value: 10, unit: "decimal_hours" },
      actual: { kind: "hours", value: 8, unit: "decimal_hours" },
      tolerance: 0.01
    });
    expect(delta?.sourceRefs.map((ref) => ref.sourceLayer).sort()).toEqual([
      "float_cache",
      "float_raw"
    ]);
    expect(raw.sourceLayer).toBe("float_raw");
    expect(cache.sourceLayer).toBe("float_cache");
  });

  test("fails inactive Float visible dashboard hours even when cache exists", () => {
    const checks = createFloatReconciliationChecks({
      scope,
      facts: [
        floatFact({
          id: "inactive-cache",
          sourceLayer: "float_cache",
          hours: 4,
          jobNumber: "UCS_INACTIVE_VISIBLE"
        }),
        floatFact({
          id: "inactive-visible",
          sourceLayer: "float_visible",
          hours: 4,
          jobNumber: "UCS_INACTIVE_VISIBLE",
          activeState: "inactive"
        })
      ]
    });

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FLOAT_INACTIVE_VISIBLE_HOURS",
          status: "FAIL",
          expected: expect.objectContaining({ kind: "hours", value: 0 }),
          actual: expect.objectContaining({ kind: "hours", value: 4 })
        })
      ])
    );
  });

  test("treats multi-person split cache facts as evidence for one raw task total", () => {
    const checks = createFloatReconciliationChecks({
      scope,
      facts: [
        floatFact({
          id: "split-raw",
          sourceLayer: "float_raw",
          hours: 10,
          jobNumber: "UCS_SPLIT",
          person: "Multiple people",
          allocationClass: "pencil",
          expansionRule: "raw_task_span"
        }),
        floatFact({
          id: "split-cache-a",
          sourceLayer: "float_cache",
          hours: 6,
          jobNumber: "UCS_SPLIT",
          person: "A. Person",
          personId: "person-a",
          allocationClass: "allocated",
          expansionRule: "monthly_person_split"
        }),
        floatFact({
          id: "split-cache-b",
          sourceLayer: "float_cache",
          hours: 4,
          jobNumber: "UCS_SPLIT",
          person: "B. Person",
          personId: "person-b",
          allocationClass: "allocated",
          expansionRule: "monthly_person_split"
        })
      ]
    });

    expect(checks.filter((check) => check.scope.jobNumber === "UCS_SPLIT")).toEqual([]);
  });

  test("does not reconcile out-of-scope Float facts into the active dashboard scope", () => {
    const checks = createFloatReconciliationChecks({
      scope,
      facts: [
        floatFact({
          id: "in-scope-raw",
          sourceLayer: "float_raw",
          hours: 4,
          jobNumber: "UCS_IN_SCOPE"
        }),
        floatFact({
          id: "wrong-office-raw",
          sourceLayer: "float_raw",
          hours: 9,
          jobNumber: "UCS_WRONG_OFFICE",
          office: "USA"
        }),
        floatFact({
          id: "wrong-month-raw",
          sourceLayer: "float_raw",
          hours: 12,
          jobNumber: "UCS_WRONG_MONTH",
          month: "2026-04"
        })
      ]
    });

    expect(checks.map((check) => check.scope.jobNumber)).toEqual(["UCS_IN_SCOPE"]);
    expect(checks[0]?.actual).toMatchObject({
      kind: "hours",
      value: 0
    });
    expect(checks[0]?.expected).toMatchObject({
      kind: "hours",
      value: 4
    });
  });
});
