import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  dashboardDataMode,
  getDashboardContractSync,
  getDashboardFactSetSync
} from "../../src/lib/runtime/dashboard-contract";
import type { MetricValue, SourceLayer, SourceName } from "../../src/lib";
import type { SourceArchiveRecord, SourceRowIdentity } from "../../src/lib/source-archive/types";

const baseScope = {
  office: "LDN",
  from: "2026-01-01",
  to: "2026-03-31"
} as const;

describe("runtime dashboard contract provider", () => {
  test("defaults to fixture mode until live source archive parsing is implemented", () => {
    expect(dashboardDataMode({})).toBe("fixture");

    const contract = getDashboardContractSync(baseScope, { env: {} });

    expect(contract.scope).toEqual(baseScope);
    expect(contract.visibleRows.length).toBeGreaterThan(0);
  });

  test("blocks source archive mode without explicit archive rows", () => {
    const env = { DASHBOARD_DATA_MODE: "source_archive" };

    expect(dashboardDataMode(env)).toBe("source_archive");
    expect(() => getDashboardContractSync(baseScope, { env })).toThrow(/requires explicit sourceArchiveRows/);
    expect(() => getDashboardFactSetSync({ env })).toThrow(/requires explicit sourceArchiveRows/);
  });

  test("builds a partial display contract from explicit source archive rows", () => {
    const env = { DASHBOARD_DATA_MODE: "source_archive" };
    const sourceArchiveRows = sourceArchiveFixtureRows();
    const factSet = getDashboardFactSetSync({
      env,
      sourceArchiveRows,
      generatedAt: "2026-05-21T00:00:00.000Z"
    });
    const contract = getDashboardContractSync(baseScope, {
      env,
      sourceArchiveRows,
      generatedAt: "2026-05-21T00:00:00.000Z"
    });

    expect(factSet.soldFacts).toHaveLength(1);
    expect(factSet.pipelineFacts).toHaveLength(1);
    expect(factSet.productionRevenueFacts).toHaveLength(1);
    expect(factSet.floatFacts).toHaveLength(1);
    expect(factSet.floatFacts[0]?.sourceLayer).toBe("float_raw");
    expect(factSet.floatFacts[0]?.isAdditive).toBe(false);

    const row = contract.visibleRows.find((candidate) => candidate.jobNumber === "UCS04154");

    expect(moneyNumber(contract.heroTotals.soldFee)).toBe(1000);
    expect(hoursNumber(contract.heroTotals.soldHours)).toBe(10);
    expect(contract.heroTotals.floatHours.kind).toBe("unsupported");
    expect(row?.sourceTrace.map((sourceRef) => sourceRef.sourceLayer)).toEqual(
      expect.arrayContaining(["sold", "pipeline", "production_revenue", "float_raw"])
    );
    expect(row?.totals.floatHours.kind).toBe("unsupported");
  });

  test("app routes and chat tools use the runtime provider, not the fixture provider directly", () => {
    const searchedRoots = ["app", "src/lib/chat"].map((root) => join(process.cwd(), root));
    const offenders = searchedRoots
      .flatMap((root) => listFiles(root))
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .filter((file) => readFileSync(file, "utf8").includes("fixture-contract"))
      .map((file) => file.replace(`${process.cwd()}/`, ""));

    expect(offenders).toEqual([]);
  });
});

function listFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const fullPath = join(root, entry);
    const stat = statSync(fullPath);

    return stat.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function moneyNumber(metric: MetricValue): number | undefined {
  return metric.kind === "money" ? metric.value.amountGbp : undefined;
}

function hoursNumber(metric: MetricValue): number | undefined {
  return metric.kind === "hours" ? metric.value : undefined;
}

function sourceArchiveFixtureRows(): SourceArchiveRecord[] {
  return [
    rawRow("fee_sheet", "raw_fee_header", {
      rowKind: "project_header",
      jobNumber: "UCS04154",
      client: "Acme Studios",
      projectName: "Launch Planning",
      office: "LDN",
      feeSheetFloatId: "10480262"
    }),
    rawRow("fee_sheet", "raw_fee_vtab", {
      rowKind: "v_tab",
      jobNumber: "UCS04154",
      client: "Acme Studios",
      projectName: "Launch Planning",
      office: "LDN",
      month: "2026-03",
      department: "Strategy",
      role: "Strategist",
      soldFee: 1000,
      soldHours: 10
    }),
    rawRow("pipeline", "raw_pipeline_header", {
      source: "pipeline",
      rowNumber: 1,
      cells: ["STATUS", "CLIENT", "OWNER", "REV", "JOB NO", "PROJECT", "OFFICE", "JAN", "FEB", "MAR"]
    }),
    rawRow("pipeline", "raw_pipeline_project", {
      source: "pipeline",
      rowNumber: 2,
      cells: ["Likely", "Acme Studios", "Jade", "", "UCS04154", "Launch Planning", "LDN", "", "", "250"]
    }),
    rawRow("production_revenue", "raw_prod_header", {
      source: "production_revenue",
      rowNumber: 1,
      cells: ["REV STATUS", "CLIENT", "OWNER", "REV CODE", "PROJECT NO", "PROJECT", "OFFICE", "Jan-26", "Feb-26", "Mar-26"]
    }),
    rawRow("production_revenue", "raw_prod_project", {
      source: "production_revenue",
      rowNumber: 2,
      cells: ["Confirmed", "Acme Studios", "Prod", "LDN-REV", "UCS04154", "Launch Planning", "LDN", "", "", "300"]
    }),
    rawRow("float", "raw_float_project", {
      objectType: "project",
      project_id: 10480262,
      project_code: "UCS04154",
      name: "UCS04154 - Acme Launch Planning",
      active: 1
    }),
    rawRow("float", "raw_float_person", {
      objectType: "person",
      people_id: 2001,
      name: "Jane Planner",
      job_title: "SENIOR STRATEGIST",
      department: { name: "LDN Strategy" },
      people_type_id: 1,
      active: 1
    }),
    rawRow("float", "raw_float_task", {
      objectType: "task",
      task_id: 3001,
      project_id: 10480262,
      start_date: "2026-03-02",
      end_date: "2026-03-04",
      hours: 6,
      people_id: 2001,
      status: 2,
      billable: 1
    })
  ];
}

function rawRow(source: SourceName, id: string, raw: Readonly<Record<string, unknown>>): SourceArchiveRecord {
  const sourceObjectId = source === "float" ? id.replace(/^raw_float_/, "") : undefined;
  const sourceRowNumber = source === "float" ? undefined : (raw.rowNumber as number | undefined) ?? 1;
  const identity: SourceRowIdentity = {
    stableSourceRowKey: `${source}:${id}`,
    ...(source === "float" ? { sourceObjectId: String(sourceObjectId ?? id) } : {}),
    ...(source !== "float" && sourceRowNumber !== undefined
      ? { sourceDocumentId: `${source}_sheet`, sourceTab: "Sheet1", sourceRowNumber }
      : {})
  };
  const sourceLayer = sourceLayerFor(source);

  return {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id,
    batchId: `batch_${source}`,
    source,
    identity,
    raw,
    contentHash: `hash:${id}`,
    observedAt: "2026-05-21T00:00:00.000Z",
    sourceRefs: [
      {
        source,
        sourceLayer,
        batchId: `batch_${source}`,
        rawRowId: id,
        ...(source === "float" ? { sourceObjectId: String(sourceObjectId ?? id) } : {}),
        ...(source !== "float" && sourceRowNumber !== undefined
          ? { sourceDocumentId: `${source}_sheet`, sourceTab: "Sheet1", sourceRowNumber }
          : {})
      }
    ]
  };
}

function sourceLayerFor(source: SourceName): SourceLayer {
  if (source === "fee_sheet") return "sold";
  if (source === "float") return "float_raw";
  if (source === "read_only_sql") return "read_only_sql";
  if (source === "sync_log") return "sync_log";
  return source;
}
