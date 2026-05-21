import { describe, expect, test } from "vitest";

import { buildNamedScenarioReport } from "../../src/lib/scenarios";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";
import type { MetricValue, NamedScenarioReport, NamedScenarioResult } from "../../src/lib";

describe("Gate 5: named Sian/Yunni/Jade regression scenarios", () => {
  test("LDN Q1 Design: rollup, Projects, footer, CSV, and detail agree for supported metrics", () => {
    const scenario = namedScenario("ldn-q1-design");
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design"
    });

    expect(scenario).toMatchObject({
      owner: "Sian",
      status: "pass",
      classification: "display_contract_agrees"
    });
    expect(metricNumber(contract.footerTotals.soldFee)).toBe(metricNumber(contract.heroTotals.soldFee));
    expect(metricNumber(contract.footerTotals.floatHours)).toBe(metricNumber(contract.heroTotals.floatHours));
    expect(contract.csvRows.map((row) => row.id)).toEqual(contract.visibleRows.map((row) => row.id));
    expect(contract.visibleRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          jobNumber: "UCS04787",
          canonicalClient: "British Airways"
        })
      ])
    );
  });

  test("UCS04787: raw Float, cache, visible dashboard, and export are compared or marked unresolved", () => {
    const scenario = namedScenario("ucs04787");

    expect(scenario).toMatchObject({
      owner: "Yunni",
      status: "warn",
      classification: "source_or_cache_warning",
      chatEvidenceResult: {
        status: "needs_codex"
      }
    });
    expect(scenario.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "float_layers_compared", status: "pass" }),
        expect.objectContaining({ code: "raw_cache_visible_mismatch_surfaced", status: "warn" })
      ])
    );
    expect(scenario.warningEvidence?.rawCacheVisibleStatus).toMatchObject({
      raw: "represented",
      cache: "missing",
      visible: "represented"
    });
  });

  test("UCS05186: duplicate/manual Float candidates remain visible and are not silently merged", () => {
    const scenario = namedScenario("ucs05186");
    const contract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      jobNumber: "UCS05186"
    });

    expect(scenario).toMatchObject({
      owner: "Yunni",
      status: "warn"
    });
    expect(contract.visibleRows.map((row) => row.canonicalFloatProjectId)).toEqual([
      "11413292",
      "manual-ucs05186"
    ]);
    expect(contract.visibleRows.map((row) => row.canonicalProjectName)).toEqual([
      "Boldbean Brand Platform",
      "Boldbean Manual Duplicate"
    ]);
  });

  test("UCS04154: fee-sheet Float ID is the canonical join key", () => {
    const scenario = namedScenario("ucs04154");

    expect(scenario).toMatchObject({
      owner: "Yunni",
      status: "pass",
      classification: "join_key_protected",
      displayContractResult: {
        status: "pass"
      }
    });
    expect(scenario.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "fee_sheet_float_id_join_key", status: "pass" }),
        expect.objectContaining({ code: "manual_duplicate_not_winner", status: "pass" })
      ])
    );
  });

  test("PCS00250: cache hours without raw task rows surface as WARN, not PASS", () => {
    const scenario = namedScenario("pcs00250");

    expect(scenario.status).toBe("warn");
    expect(scenario.approvalStatus).not.toBe("ready_for_stakeholder_review");
    expect(scenario.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "cache_without_raw_warn", status: "warn" }),
        expect.objectContaining({ code: "not_green_when_cache_only", status: "pass" })
      ])
    );
  });

  test("USA00262: nonzero source sold hours cannot be reported as zero", () => {
    const scenario = namedScenario("usa00262");
    const contract = getFixtureDashboardContract({
      office: "USA",
      from: "2026-01-01",
      to: "2026-03-31",
      jobNumber: "USA00262"
    });

    expect(scenario.status).toBe("pass");
    expect(metricNumber(contract.visibleRows[0]?.totals.soldHours)).toBeGreaterThan(0);
    expect(contract.visibleRows[0]?.canonicalClient).toBe("White & Case");
  });

  test("USA00323: raw parser rows cannot be summed without additive proof", () => {
    const scenario = namedScenario("usa00323");
    const contract = getFixtureDashboardContract({
      office: "USA",
      from: "2026-01-01",
      to: "2026-03-31",
      jobNumber: "USA00323"
    });

    expect(scenario.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "raw_parser_not_total", status: "pass" })
      ])
    );
    expect(metricNumber(contract.visibleRows[0]?.totals.soldHours)).toBeGreaterThan(0);
    expect(contract.visibleRows[0]?.canonicalClient).toBe("Chobani");
  });

  test("BT raw-without-cache: raw Float without allocation cache is classified as unresolved", () => {
    const scenario = namedScenario("bt-raw-without-cache");

    expect(scenario).toMatchObject({
      owner: "Yunni",
      status: "warn",
      classification: "source_or_cache_warning",
      warningEvidence: {
        classification: "unresolved"
      }
    });
    expect(scenario.unresolvedConflicts).toEqual(
      expect.arrayContaining([expect.stringContaining("unresolved")])
    );
  });

  test("archived production revenue: Projects and CSV include archived source revenue with a warning", () => {
    const scenario = namedScenario("archived-production-revenue");
    const contract = getFixtureDashboardContract({
      office: "ALL",
      from: "2026-01-01",
      to: "2026-12-31"
    });
    const archivedRow = contract.visibleRows.find((row) =>
      row.warnings.some((warning) => warning.code === "ARCHIVED_PRODUCTION_REVENUE_VISIBLE")
    );

    expect(scenario.status).toBe("pass");
    expect(archivedRow).toMatchObject({
      rowType: "production_revenue_only",
      canonicalProjectName: "Archived Production Revenue"
    });
    expect(contract.csvRows.find((row) => row.id === archivedRow?.id)?.warnings).toEqual(archivedRow?.warnings);
  });

  test("TBC pipeline identity: TBC pipeline rows preserve distinct source identity", () => {
    const scenario = namedScenario("tbc-pipeline-identity");
    const contract = getFixtureDashboardContract({
      office: "ALL",
      from: "2026-01-01",
      to: "2026-12-31"
    });
    const tbcRow = contract.visibleRows.find((row) => row.rowType === "pipeline_only");

    expect(scenario).toMatchObject({
      owner: "Jade",
      status: "pass",
      classification: "source_only_visible"
    });
    expect(tbcRow?.id).toContain("source-row:fixture-pipeline-tbc");
    expect(tbcRow?.sourceTrace.map((ref) => ref.rawRowId)).toContain("fixture-pipeline-tbc");
  });

  test("exact client drilldown: client param is exact and search remains fuzzy only", () => {
    const scenario = namedScenario("exact-client-drilldown");
    const exactClientContract = getFixtureDashboardContract({
      office: "LDN",
      from: "2026-01-01",
      to: "2026-12-31",
      client: "British Airways"
    });

    expect(scenario).toMatchObject({
      owner: "Sian",
      status: "pass",
      classification: "display_contract_agrees"
    });
    expect(exactClientContract.visibleRows.map((row) => row.canonicalClient ?? row.sourceClient)).toEqual([
      "British Airways"
    ]);
  });
});

function namedScenario(id: string): NamedScenarioResult {
  const report: NamedScenarioReport = buildNamedScenarioReport();
  const scenario = report.scenarios.find((item) => item.id === id);
  if (scenario === undefined) throw new Error(`Missing named scenario ${id}.`);
  return scenario;
}

function metricNumber(value: MetricValue | undefined): number {
  if (value?.kind === "money") return value.value.amountGbp;
  if (value?.kind === "hours" || value?.kind === "count") return value.value;
  return 0;
}
