import { describe, expect, test } from "vitest";

import expected from "../../fixtures/parsed-facts/float/p3-e-basic.json";
import sourceRowsFixture from "../../fixtures/source-rows/float/p3-e-basic.json";
import { parseArchivedFloatRows } from "../../src/lib/parsers/float";
import type { ArchivedRawSourceRow } from "../../src/lib/source-archive/types";

const sourceRows = sourceRowsFixture as ArchivedRawSourceRow[];

function hoursValue(fact: { hours?: unknown }): number | undefined {
  if (!fact.hours || typeof fact.hours !== "object" || !("kind" in fact.hours)) {
    return undefined;
  }

  const hours = fact.hours as { kind?: unknown; value?: unknown };
  return hours.kind === "hours" && typeof hours.value === "number" ? hours.value : undefined;
}

describe("P3-E Float parser", () => {
  test("preserves Float project, task, person, date, and hour facts as raw evidence", () => {
    const result = parseArchivedFloatRows(sourceRows);

    expect(result.parserName).toBe("float");
    expect(result.source).toBe("float");
    expect(result.sourceRowsRead).toBe(sourceRows.length);
    expect(result.sourceRowsSkipped).toBe(0);
    expect(result.facts.map((fact) => fact.id)).toEqual(expected.factIds);

    const allocated = result.facts.find((fact) =>
      fact.rawRowIds.includes(expected.allocatedFact.rawRowId)
    );

    expect(allocated).toBeDefined();
    expect(allocated?.floatProjectId).toBe(expected.allocatedFact.floatProjectId);
    expect(allocated?.projectName).toBe(expected.allocatedFact.projectName);
    expect(allocated?.taskId).toBe(expected.allocatedFact.taskId);
    expect(allocated?.personId).toBe(expected.allocatedFact.personId);
    expect(allocated?.person).toBe(expected.allocatedFact.person);
    expect(allocated?.department).toBe(expected.allocatedFact.department);
    expect(allocated?.role).toBe(expected.allocatedFact.role);
    expect(allocated?.from).toBe(expected.allocatedFact.from);
    expect(allocated?.to).toBe(expected.allocatedFact.to);
    expect(allocated?.month).toBe(expected.allocatedFact.month);
    expect(hoursValue(allocated!)).toBe(expected.allocatedFact.hours);
    expect(allocated?.parserEvidence.additiveStatus).toBe(expected.allocatedFact.additiveStatus);
    expect(allocated?.isAdditive).toBe(expected.allocatedFact.isAdditive);
    expect(allocated?.sourceLayer).toBe("float_raw");
    expect(allocated?.batchId).toBe("batch_float_p3e_001");
    expect(allocated?.trace.some((sourceRef) => sourceRef.rawRowId === expected.allocatedFact.rawRowId)).toBe(
      true
    );
  });

  test("preserves state, tentative flags, and every Float allocation classification", () => {
    const result = parseArchivedFloatRows(sourceRows);

    expect([...new Set(result.facts.map((fact) => fact.allocationClass))].sort()).toEqual(
      [...expected.expectedAllocationClasses].sort()
    );

    for (const rawRowId of expected.tentativeRawRowIds) {
      const fact = result.facts.find((candidate) => candidate.rawRowIds.includes(rawRowId));

      expect(fact?.tentative).toBe(true);
    }

    const inactive = result.facts.find((fact) =>
      fact.rawRowIds.includes(expected.inactiveRawRowId)
    );
    const archived = result.facts.find((fact) =>
      fact.rawRowIds.includes(expected.archivedRawRowId)
    );

    expect(inactive?.activeState).toBe("inactive");
    expect(hoursValue(inactive!)).toBeGreaterThan(0);
    expect(archived?.activeState).toBe("archived");
    expect(hoursValue(archived!)).toBeGreaterThan(0);
  });

  test("keeps duplicate and manual Float candidates as warnings instead of choosing a canonical row", () => {
    const result = parseArchivedFloatRows(sourceRows);
    const duplicateWarning = result.warnings.find((warning) =>
      warning.code === "DUPLICATE_FLOAT_CANDIDATE"
    );
    const manualWarning = result.warnings.find((warning) =>
      warning.code === "MANUAL_DUPLICATE_CANDIDATE"
    );

    expect(duplicateWarning?.rawRowIds).toEqual(expected.duplicateWarningRawRowIds);
    expect(manualWarning?.rawRowIds).toEqual([expected.manualDuplicateRawRowId]);
    expect(result.facts.filter((fact) => fact.projectName?.includes("Duplicate"))).toHaveLength(2);
    expect(result.facts.map((fact) => fact.floatProjectId)).toContain("11009999");
  });

  test("warns without hiding inactive, archived, or multi-person split Float hours", () => {
    const result = parseArchivedFloatRows(sourceRows);
    const warningCodes = result.warnings.map((warning) => warning.code);

    expect(warningCodes.sort()).toEqual([...expected.expectedWarningCodes].sort());
    expect(
      result.warnings.find((warning) => warning.code === "INACTIVE_FLOAT_WITH_HOURS")?.rawRowIds
    ).toEqual([expected.inactiveRawRowId]);
    expect(
      result.warnings.find((warning) => warning.code === "ARCHIVED_FLOAT_WITH_HOURS")?.rawRowIds
    ).toEqual([expected.archivedRawRowId]);
    expect(
      result.warnings.find((warning) => warning.code === "MULTI_PERSON_SPLIT_AMBIGUITY")?.rawRowIds
    ).toEqual([expected.multiPersonRawRowId]);

    const splitFact = result.facts.find((fact) =>
      fact.rawRowIds.includes(expected.multiPersonRawRowId)
    );

    expect(splitFact?.allocationClass).toBe("pencil");
    expect(splitFact?.person).toBe("Multiple people");
    expect(hoursValue(splitFact!)).toBe(10);
  });

  test("never creates cache facts, visible rows, dashboard totals, or corrected Float joins", () => {
    const result = parseArchivedFloatRows(sourceRows);

    expect("displayRows" in result).toBe(false);
    expect("visibleRows" in result).toBe(false);
    expect("dashboardRows" in result).toBe(false);
    expect("totals" in result).toBe(false);
    expect(result.facts.every((fact) => fact.sourceLayer === "float_raw")).toBe(true);
    expect(result.facts.every((fact) => fact.isAdditive === false)).toBe(true);
    expect(result.facts.some((fact) => fact.sourceLayer === "float_cache")).toBe(false);
    expect(result.facts.some((fact) => fact.sourceLayer === "float_visible")).toBe(false);
    expect(result.facts.every((fact) => fact.rawRowIds.length > 0 && fact.batchId.length > 0)).toBe(
      true
    );
    expect(result.facts.some((fact) => "dashboardHours" in fact)).toBe(false);
    expect(result.facts.some((fact) => "correctedFloatProjectId" in fact)).toBe(false);
  });
});
