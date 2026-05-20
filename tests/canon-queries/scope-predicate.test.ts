import { describe, expect, test } from "vitest";

import type { PipelineFact, SoldFact, SourceCapability } from "../../src/lib";
import { factMatchesScope } from "../../src/lib/canon-queries";

const soldCapabilities: SourceCapability[] = [
  { key: "project", status: "supported" },
  { key: "month", status: "supported" },
  { key: "office", status: "supported" },
  { key: "client", status: "supported" },
  { key: "department", status: "supported" },
  { key: "role", status: "partial" },
  { key: "person", status: "unsupported" }
];

const soldFact: SoldFact = {
  id: "fee_sheet:batch:row-1",
  source: "fee_sheet",
  sourceLayer: "sold",
  rawRowIds: ["row-1"],
  batchId: "batch",
  jobNumber: "UCS04154",
  floatProjectId: "10480262",
  feeSheetFloatId: "10480262",
  client: "Acme Studios",
  sourceClient: "Acme Studios",
  canonicalClient: "Acme Studios",
  projectName: "Q1 Launch",
  sourceProjectName: "Q1 Launch",
  office: "LDN",
  month: "2026-03",
  department: "Design",
  role: "Senior Designer",
  amount: {
    kind: "money",
    value: {
      amountOriginal: 1000,
      currencyOriginal: "GBP",
      amountGbp: 1000,
      fxRateToGbp: 1,
      fxSource: "fixture",
      fxCapturedAt: "2026-05-20T00:00:00.000Z"
    }
  },
  hours: {
    kind: "hours",
    value: 10,
    unit: "decimal_hours"
  },
  isAdditive: true,
  confidence: "high",
  warnings: [],
  trace: [
    {
      source: "fee_sheet",
      sourceLayer: "sold",
      batchId: "batch",
      rawRowId: "row-1"
    }
  ]
};

describe("P4-A scope predicate", () => {
  test("matches office, date, department, role, job number, and Float ID explicitly", () => {
    expect(
      factMatchesScope(soldFact, {
        office: "LDN",
        from: "2026-01-01",
        to: "2026-03-31",
        department: "Design",
        role: "Senior Designer",
        jobNumber: "UCS04154",
        floatProjectId: "10480262"
      }, soldCapabilities)
    ).toBe(true);

    expect(
      factMatchesScope(soldFact, {
        office: "USA",
        from: "2026-01-01",
        to: "2026-03-31"
      }, soldCapabilities)
    ).toBe(false);
  });

  test("keeps exact client filtering distinct from fuzzy search", () => {
    expect(
      factMatchesScope(soldFact, {
        office: "ALL",
        from: "2026-01-01",
        to: "2026-03-31",
        client: "Acme"
      }, soldCapabilities)
    ).toBe(false);

    expect(
      factMatchesScope(soldFact, {
        office: "ALL",
        from: "2026-01-01",
        to: "2026-03-31",
        search: "Acme"
      }, soldCapabilities)
    ).toBe(true);
  });

  test("does not filter by a scoped field when the source capability is unsupported", () => {
    const pipelineCapabilities: SourceCapability[] = [
      { key: "department", status: "unsupported", reason: "Pipeline has no department field." }
    ];
    const { department: _department, feeSheetFloatId: _feeSheetFloatId, ...factWithoutDepartment } = soldFact;
    const pipelineLikeFact: PipelineFact = {
      ...factWithoutDepartment,
      source: "pipeline",
      sourceLayer: "pipeline",
      stablePipelineIdentity: "source-row:row-1"
    };

    expect(
      factMatchesScope(
        pipelineLikeFact,
        {
          office: "LDN",
          from: "2026-01-01",
          to: "2026-03-31",
          department: "Design"
        },
        pipelineCapabilities
      )
    ).toBe(true);
  });
});
