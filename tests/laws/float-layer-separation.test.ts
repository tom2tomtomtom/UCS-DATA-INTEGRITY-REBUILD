import { describe, expect, test } from "vitest";

import type { DashboardScope, FloatFact } from "../../src/lib/canon/types";
import { createFloatReconciliationChecks } from "../../src/lib/display/float-reconciliation";
import { parseArchivedFloatRows } from "../../src/lib/parsers/float";
import { buildSourceSnapshotImportPlan } from "../../src/lib/source-import/snapshot-import";

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
  readonly floatProjectId?: string;
  readonly activeState?: FloatFact["activeState"];
  readonly isAdditive?: boolean;
}): FloatFact {
  return {
    id: input.id,
    source: "float",
    sourceLayer: input.sourceLayer,
    rawRowIds: [`raw-${input.id}`],
    batchId: `batch-${input.sourceLayer}`,
    jobNumber: input.jobNumber,
    ...(input.client === undefined ? {} : { client: input.client }),
    ...(input.floatProjectId === undefined ? {} : { floatProjectId: input.floatProjectId }),
    office: "LDN",
    month: "2026-03",
    hours: {
      kind: "hours",
      value: input.hours,
      unit: "decimal_hours"
    },
    activeState: input.activeState ?? "active",
    isAdditive: input.isAdditive ?? true,
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

function floatRows(rows: ReadonlyArray<{
  readonly key: string;
  readonly raw: Record<string, unknown>;
}>) {
  return buildSourceSnapshotImportPlan({
    snapshotId: "law-float-layer-separation",
    capturedAt: "2026-05-20T18:00:00.000Z",
    readOnly: true,
    sources: [
      {
        source: "float",
        mode: "manual_snapshot",
        sourceLabel: "Float law fixture",
        rows: rows.map((row) => ({
          identity: {
            stableSourceRowKey: row.key,
            sourceObjectId: row.key
          },
          raw: row.raw
        }))
      }
    ]
  }).rawRows;
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
  test("classifies raw/cache non-trivial deltas as at least WARN", () => {
    const checks = createFloatReconciliationChecks({
      scope,
      facts: [
        floatFact({
          id: "delta-raw",
          sourceLayer: "float_raw",
          hours: 100,
          jobNumber: "UCS04787",
          floatProjectId: "float-04787"
        }),
        floatFact({
          id: "delta-cache",
          sourceLayer: "float_cache",
          hours: 80,
          jobNumber: "UCS04787",
          floatProjectId: "float-04787"
        })
      ]
    });

    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FLOAT_RAW_CACHE_DELTA",
          status: "DATA_WARN",
          expected: expect.objectContaining({ kind: "hours", value: 100 }),
          actual: expect.objectContaining({ kind: "hours", value: 80 })
        })
      ])
    );
  });

  test("classifies inactive Float hours contributing visibly as FAIL", () => {
    const checks = createFloatReconciliationChecks({
      scope,
      facts: [
        floatFact({
          id: "inactive-cache",
          sourceLayer: "float_cache",
          hours: 8,
          jobNumber: "UCS09901",
          activeState: "active"
        }),
        floatFact({
          id: "inactive-visible",
          sourceLayer: "float_visible",
          hours: 8,
          jobNumber: "UCS09901",
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
          actual: expect.objectContaining({ kind: "hours", value: 8 })
        })
      ])
    );
  });

  test("preserves multi-person Float task split evidence", () => {
    const parserResult = parseArchivedFloatRows(
      floatRows([
        {
          key: "float:multi-person:task-1",
          raw: {
            objectType: "task",
            floatProjectId: "float-split",
            projectCode: "UCS09902",
            taskId: "task-1",
            month: "2026-03",
            hours: 12,
            activeState: "active",
            assignedPeople: [
              { personId: "person-1", personName: "One" },
              { personId: "person-2", personName: "Two" }
            ]
          }
        }
      ])
    );

    expect(parserResult.facts).toHaveLength(1);
    expect(parserResult.facts[0]).toMatchObject({
      jobNumber: "UCS09902",
      floatProjectId: "float-split",
      hours: expect.objectContaining({ kind: "hours", value: 12 })
    });
    expect(parserResult.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MULTI_PERSON_SPLIT_AMBIGUITY",
          severity: "DATA_WARN"
        })
      ])
    );
  });

  test("keeps UCS04787 raw, cache, visible, and export layers separately inspectable", () => {
    const facts = [
      floatFact({
        id: "ucs04787-raw",
        sourceLayer: "float_raw",
        hours: 2094.9,
        jobNumber: "UCS04787",
        floatProjectId: "float-04787"
      }),
      floatFact({
        id: "ucs04787-cache",
        sourceLayer: "float_cache",
        hours: 1430,
        jobNumber: "UCS04787",
        floatProjectId: "float-04787"
      }),
      floatFact({
        id: "ucs04787-visible",
        sourceLayer: "float_visible",
        hours: 1430,
        jobNumber: "UCS04787",
        floatProjectId: "float-04787"
      }),
      floatFact({
        id: "ucs04787-export",
        sourceLayer: "float_export",
        hours: 1597.5,
        jobNumber: "UCS04787",
        floatProjectId: "float-04787"
      })
    ];

    const layersByFact = facts.map((fact) => fact.sourceLayer);
    const checks = createFloatReconciliationChecks({ scope, facts });

    expect(layersByFact).toEqual([
      "float_raw",
      "float_cache",
      "float_visible",
      "float_export"
    ]);
    expect(new Set(facts.map((fact) => fact.id)).size).toBe(4);
    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "FLOAT_RAW_CACHE_DELTA",
          status: "DATA_WARN",
          expected: expect.objectContaining({ kind: "hours", value: 2094.9 }),
          actual: expect.objectContaining({ kind: "hours", value: 1430 })
        })
      ])
    );
    expect(checks.flatMap((check) => check.sourceRefs).map((ref) => ref.sourceLayer)).toEqual(
      expect.arrayContaining(["float_raw", "float_cache"])
    );
    expect(checks.flatMap((check) => check.sourceRefs).map((ref) => ref.sourceLayer)).not.toContain("float_export");
  });
});
