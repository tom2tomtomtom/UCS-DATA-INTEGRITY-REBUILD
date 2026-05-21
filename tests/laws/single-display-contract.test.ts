import { describe, expect, test } from "vitest";

import { buildProjectDetailViewModel } from "../../src/lib/display/project-detail-view";
import { buildCsvRowsFromDisplayContract } from "../../src/lib";
import type { DashboardProjectRow, MetricValue } from "../../src/lib";
import { executeReadOnlyTool } from "../../src/lib/chat";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("Law 3: one display contract owns all visible numbers", () => {
  test("derives hero totals from the same scoped display contract rows", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design"
    });

    expect(metricNumber(contract.heroTotals.soldFee)).toBe(sumRows(contract.visibleRows, "soldFee"));
    expect(metricNumber(contract.heroTotals.soldHours)).toBe(sumRows(contract.visibleRows, "soldHours"));
    expect(metricNumber(contract.heroTotals.floatHours)).toBe(sumRows(contract.visibleRows, "floatHours"));
  });

  test("derives Projects footer totals from display contract rows", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design"
    });

    expect(metricNumber(contract.footerTotals.soldFee)).toBe(sumRows(contract.visibleRows, "soldFee"));
    expect(metricNumber(contract.footerTotals.soldHours)).toBe(sumRows(contract.visibleRows, "soldHours"));
    expect(metricNumber(contract.footerTotals.floatHours)).toBe(sumRows(contract.visibleRows, "floatHours"));
  });

  test("derives CSV rows from the display contract rows", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design"
    });

    expect(contract.csvRows).toEqual(buildCsvRowsFromDisplayContract(contract));
    expect(contract.csvRows.map((row) => row.id)).toEqual(contract.visibleRows.map((row) => row.id));
  });

  test("derives project detail values from the scoped display contract model", () => {
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      jobNumber: "UCS05186"
    });
    const detail = buildProjectDetailViewModel(contract, "UCS05186");

    expect(detail).toBeDefined();
    expect(detail?.matchingRows.map((row) => row.id)).toEqual(contract.visibleRows.map((row) => row.id));
    expect(metricNumber(detail?.row.totals.floatHours)).toBe(metricNumber(contract.footerTotals.floatHours));
    expect(metricNumber(detail?.floatTraceSummary.dashboardVisibleHours)).toBe(metricNumber(contract.footerTotals.floatHours));
    expect(detail?.row.sourceTrace.map((ref) => ref.rawRowId)).toEqual(
      expect.arrayContaining(["fixture-float-visible-ucs05186-canonical", "fixture-float-visible-ucs05186-manual"])
    );
  });

  test("derives chat evidence rows from the display contract without collapsing duplicate jobs", () => {
    const scope = {
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      jobNumber: "UCS05186"
    } as const;
    const contract = getFixtureDashboardContract(scope);
    const result = executeReadOnlyTool({
      tool: "inspect_project",
      scope,
      jobNumber: "UCS05186"
    });

    expect(result.contractRows.map((row) => row.id)).toEqual(contract.visibleRows.map((row) => row.id));
    expect(result.contractRows).toHaveLength(2);
    expect(result.facts.map((fact) => fact.contractRowId)).toEqual(
      expect.arrayContaining(contract.visibleRows.map((row) => row.id))
    );
    expect(result.contractRows.map((row) => row.canonicalFloatProjectId)).toEqual([
      "11413292",
      "manual-ucs05186"
    ]);
  });
});

type DashboardMetricKey = keyof DashboardProjectRow["totals"];

function sumRows(rows: readonly DashboardProjectRow[], metric: DashboardMetricKey): number {
  return rows.reduce((total, row) => total + metricNumber(row.totals[metric]), 0);
}

function metricNumber(value: MetricValue | undefined): number {
  if (value?.kind === "money") return value.value.amountGbp;
  if (value?.kind === "hours" || value?.kind === "count") return value.value;
  return 0;
}
