import { describe, expect, test } from "vitest";

import sourceRowsFixture from "../../fixtures/source-rows/fee-sheets/p3-b-basic.json";
import type { DashboardScope, MetricValue } from "../../src/lib/canon/types";
import { selectSoldFacts } from "../../src/lib/canon-queries/sold";
import { parseArchivedFeeSheetRows } from "../../src/lib/parsers/fee-sheet";
import type { ArchivedRawSourceRow } from "../../src/lib/source-archive/types";

const sourceRows = sourceRowsFixture as ArchivedRawSourceRow[];

const marchAllScope: DashboardScope = {
  office: "ALL",
  from: "2026-03-01",
  to: "2026-03-31"
};

function parsedSoldFacts() {
  return parseArchivedFeeSheetRows(sourceRows);
}

function select(scope: DashboardScope) {
  const parsed = parsedSoldFacts();

  return selectSoldFacts({
    scope,
    facts: parsed.facts,
    capabilities: parsed.capabilities[0]?.capabilities ?? []
  });
}

function moneyAmount(fact: { amount?: MetricValue } | undefined): number | undefined {
  return fact?.amount?.kind === "money" ? fact.amount.value.amountGbp : undefined;
}

function hoursValue(fact: { hours?: MetricValue } | undefined): number | undefined {
  return fact?.hours?.kind === "hours" ? fact.hours.value : undefined;
}

describe("P4-B sold fee sheet source fact selector", () => {
  test("returns scoped sold source facts without display rows or totals", () => {
    const parsed = parsedSoldFacts();
    const result = selectSoldFacts({
      scope: marchAllScope,
      facts: parsed.facts,
      capabilities: parsed.capabilities[0]?.capabilities ?? []
    });

    expect(result.source).toBe("fee_sheet");
    expect(result.scope).toEqual(marchAllScope);
    expect(result.scope).not.toBe(marchAllScope);
    expect(result.facts.map((fact) => fact.id)).toEqual(parsed.facts.map((fact) => fact.id));
    expect(result.capabilities).toEqual(parsed.capabilities[0]?.capabilities);
    expect("totals" in result).toBe(false);
    expect("displayRows" in result).toBe(false);
    expect("visibleRows" in result).toBe(false);
    expect("csvRows" in result).toBe(false);
    expect("dashboardRows" in result).toBe(false);
  });

  test("keeps zero-fee nonzero-hour rows and CLIENT SUMMARY plus V-tab evidence inspectable", () => {
    const result = select(marchAllScope);
    const zeroFeeHours = result.facts.find((fact) =>
      fact.rawRowIds.includes("raw_fee_p3b_004_vtab_strategy_zero_fee")
    );
    const clientSummary = result.facts.find((fact) =>
      fact.rawRowIds.includes("raw_fee_p3b_002_client_summary")
    );
    const vTabDetail = result.facts.find((fact) =>
      fact.rawRowIds.includes("raw_fee_p3b_003_vtab_design")
    );
    const vTabSummary = result.facts.find((fact) =>
      fact.rawRowIds.includes("raw_fee_p3b_005_vtab_total")
    );

    expect(zeroFeeHours).toBeDefined();
    expect(moneyAmount(zeroFeeHours)).toBe(0);
    expect(hoursValue(zeroFeeHours)).toBe(8);
    expect(clientSummary?.sourceLayer).toBe("fee_sheet_parser_summary");
    expect(vTabDetail?.sourceLayer).toBe("sold");
    expect(vTabSummary?.sourceLayer).toBe("fee_sheet_parser_summary");
  });

  test("uses row-level office for scoped filtering", () => {
    const result = select({
      ...marchAllScope,
      office: "USA"
    });

    expect(result.facts.map((fact) => fact.rawRowIds.at(-1))).toEqual([
      "raw_fee_p3b_003_vtab_design"
    ]);
    expect(result.facts[0]?.office).toBe("USA");
  });

  test("filters by explicit combined office set without using search", () => {
    const result = select({
      ...marchAllScope,
      office: "ALL",
      offices: ["LDN", "USA"]
    });

    expect(new Set(result.facts.map((fact) => fact.office))).toEqual(new Set(["LDN", "USA"]));
    expect(result.scope).toMatchObject({
      office: "ALL",
      offices: ["LDN", "USA"]
    });
  });

  test("keeps exact client filtering separate from fuzzy search", () => {
    expect(
      select({
        ...marchAllScope,
        client: "Chob"
      }).facts
    ).toEqual([]);

    expect(
      select({
        ...marchAllScope,
        search: "Chob"
      }).facts.map((fact) => fact.id)
    ).toEqual(select(marchAllScope).facts.map((fact) => fact.id));
  });

  test("keeps non-additive summary rows as evidence rather than summed output", () => {
    const result = select(marchAllScope);
    const summaryFacts = result.facts.filter((fact) => !fact.isAdditive);

    expect(summaryFacts.map((fact) => fact.rawRowIds.at(-1))).toEqual([
      "raw_fee_p3b_002_client_summary",
      "raw_fee_p3b_005_vtab_total"
    ]);
    expect(summaryFacts.map(moneyAmount)).toEqual([10000, 6000]);
    expect("soldFeeTotal" in result).toBe(false);
    expect("soldHoursTotal" in result).toBe(false);
    expect("totals" in result).toBe(false);
  });
});
