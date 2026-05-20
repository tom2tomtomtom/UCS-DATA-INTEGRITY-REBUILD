import { describe, expect, test } from "vitest";

import expected from "../../fixtures/parsed-facts/float/p3-e-basic.json";
import sourceRowsFixture from "../../fixtures/source-rows/float/p3-e-basic.json";
import { selectFloatFacts } from "../../src/lib/canon-queries/float";
import type { DashboardScope, FloatFact } from "../../src/lib/canon/types";
import { parseArchivedFloatRows } from "../../src/lib/parsers/float";
import type { ArchivedRawSourceRow } from "../../src/lib/source-archive/types";

const sourceRows = sourceRowsFixture as ArchivedRawSourceRow[];
const parsedFloatFacts = parseArchivedFloatRows(sourceRows).facts;

const marchScope: DashboardScope = {
  office: "ALL",
  from: "2026-03-01",
  to: "2026-03-31"
};

function hoursValue(fact: FloatFact | undefined): number | undefined {
  if (fact?.hours?.kind !== "hours") {
    return undefined;
  }

  return fact.hours.value;
}

function idsForRawRowIds(facts: readonly FloatFact[], rawRowIds: readonly string[]): string[] {
  return facts
    .filter((fact) => rawRowIds.some((rawRowId) => fact.rawRowIds.includes(rawRowId)))
    .map((fact) => fact.id);
}

function cloneAsCacheFact(fact: FloatFact): FloatFact {
  return {
    ...fact,
    id: `float-cache:${fact.id}`,
    sourceLayer: "float_cache",
    rawRowIds: [`cache:${fact.rawRowIds[0]}`],
    batchId: "batch_float_cache_p4d_001",
    trace: fact.trace.map((sourceRef) => ({
      ...sourceRef,
      sourceLayer: "float_cache",
      batchId: "batch_float_cache_p4d_001",
      rawRowId: `cache:${sourceRef.rawRowId ?? fact.rawRowIds[0]}`
    }))
  };
}

describe("P4-D Float source fact selector", () => {
  test("returns scoped Float source facts without display rows, totals, or corrected joins", () => {
    const result = selectFloatFacts({
      scope: {
        ...marchScope,
        jobNumber: "UCS05186"
      },
      facts: parsedFloatFacts
    });

    expect(result.source).toBe("float");
    expect(result.scope.jobNumber).toBe("UCS05186");
    expect(result.facts).toHaveLength(2);
    expect(idsForRawRowIds(result.facts, expected.duplicateWarningRawRowIds).sort()).toEqual(
      [
        "float:batch_float_p3e_001:raw_float_p3e_003_orphan_duplicate",
        "float:batch_float_p3e_001:raw_float_p3e_006_archived_manual_duplicate"
      ].sort()
    );
    expect(result.facts.map((fact) => fact.floatProjectId).sort()).toEqual(
      ["11000003", "11009999"].sort()
    );
    expect(result.facts.every((fact) => fact.sourceLayer === "float_raw")).toBe(true);
    expect(result.facts.some((fact) => "correctedFloatProjectId" in fact)).toBe(false);
    expect(result.facts.some((fact) => "dashboardHours" in fact)).toBe(false);
    expect("displayRows" in result).toBe(false);
    expect("visibleRows" in result).toBe(false);
    expect("dashboardRows" in result).toBe(false);
    expect("totals" in result).toBe(false);
    expect("csvRows" in result).toBe(false);
  });

  test("preserves inactive, archived, allocation class, and multi-person ambiguity source facts", () => {
    const result = selectFloatFacts({
      scope: marchScope,
      facts: parsedFloatFacts
    });

    expect(result.facts).toHaveLength(parsedFloatFacts.length);
    expect([...new Set(result.facts.map((fact) => fact.allocationClass))].sort()).toEqual(
      [...expected.expectedAllocationClasses].sort()
    );

    const inactive = result.facts.find((fact) =>
      fact.rawRowIds.includes(expected.inactiveRawRowId)
    );
    const archived = result.facts.find((fact) =>
      fact.rawRowIds.includes(expected.archivedRawRowId)
    );
    const split = result.facts.find((fact) =>
      fact.rawRowIds.includes(expected.multiPersonRawRowId)
    );

    expect(inactive?.activeState).toBe("inactive");
    expect(hoursValue(inactive)).toBeGreaterThan(0);
    expect(archived?.activeState).toBe("archived");
    expect(hoursValue(archived)).toBeGreaterThan(0);
    expect(split).toMatchObject({
      allocationClass: "pencil",
      person: "Multiple people"
    });
    expect(hoursValue(split)).toBe(10);
  });

  test("marks cache-vs-raw named regressions unresolved when scoped cache facts are absent", () => {
    const result = selectFloatFacts({
      scope: marchScope,
      facts: parsedFloatFacts
    });

    expect(result.warnings.map((warning) => warning.code).sort()).toEqual(
      ["BT_RAW_CACHE_UNRESOLVED", "PCS00250_RAW_CACHE_UNRESOLVED"].sort()
    );
    expect(result.warnings.every((warning) => warning.lifecycleState === "open")).toBe(true);
    expect(result.warnings.every((warning) => warning.status === "PROCESS_WARN")).toBe(true);
    expect(result.warnings.every((warning) => warning.sourceLayer === "float_cache")).toBe(true);
    expect(result.warnings.every((warning) => warning.resolutionEvidence === undefined)).toBe(true);
    expect(result.warnings.every((warning) => warning.sourceRefs.length > 0)).toBe(true);
  });

  test("does not mark raw-cache named regressions unresolved once scoped cache facts exist", () => {
    const firstFact = parsedFloatFacts[0];

    expect(firstFact).toBeDefined();

    const cacheFact = cloneAsCacheFact(firstFact!);
    const result = selectFloatFacts({
      scope: marchScope,
      facts: [...parsedFloatFacts, cacheFact]
    });

    expect(result.facts.some((fact) => fact.sourceLayer === "float_cache")).toBe(true);
    expect(result.warnings.map((warning) => warning.code)).not.toContain("BT_RAW_CACHE_UNRESOLVED");
    expect(result.warnings.map((warning) => warning.code)).not.toContain("PCS00250_RAW_CACHE_UNRESOLVED");
  });
});
