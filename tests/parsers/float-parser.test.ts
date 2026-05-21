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

  test("shapes live Float API project task and person rows into non-additive raw task facts", () => {
    const result = parseArchivedFloatRows([
      floatApiRow("raw_float_project_001", "10480262", {
        objectType: "project",
        project_id: 10480262,
        project_code: "UCS04154",
        name: "UCS04154 - Acme Launch Planning",
        active: 1,
        status: 2,
        tentative: 0
      }),
      floatApiRow("raw_float_person_001", "2001", {
        objectType: "person",
        people_id: 2001,
        name: "Jane Planner",
        job_title: "SENIOR STRATEGIST",
        department: { name: "LDN Strategy" },
        people_type_id: 1,
        active: 1
      }),
      floatApiRow("raw_float_task_001", "3001", {
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
    ]);

    expect(result.facts).toHaveLength(1);
    expect(result.sourceRowsRead).toBe(3);
    expect(result.sourceRowsSkipped).toBe(2);
    expect(result.facts[0]).toMatchObject({
      sourceLayer: "float_raw",
      floatProjectId: "10480262",
      jobNumber: "UCS04154",
      projectName: "UCS04154 - Acme Launch Planning",
      taskId: "3001",
      personId: "2001",
      person: "Jane Planner",
      department: "Strategy",
      role: "SENIOR STRATEGIST",
      from: "2026-03-02",
      to: "2026-03-04",
      month: "2026-03",
      allocationClass: "allocated",
      activeState: "active",
      expansionRule: "float_api_daily_hours_not_calendar_expanded"
    });
    expect(hoursValue(result.facts[0]!)).toBe(6);
    expect(result.facts[0]?.isAdditive).toBe(false);
    expect(result.facts[0]?.trace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rawRowId: "raw_float_task_001", sourceObjectId: "3001" }),
        expect.objectContaining({ rawRowId: "raw_float_project_001", sourceObjectId: "10480262" }),
        expect.objectContaining({ rawRowId: "raw_float_person_001", sourceObjectId: "2001" })
      ])
    );
  });

  test("keeps live Float API multi-person task hours raw and warns instead of splitting invisibly", () => {
    const result = parseArchivedFloatRows([
      floatApiRow("raw_float_project_002", "11048595", {
        objectType: "project",
        project_id: 11048595,
        project_code: "UCS04787",
        name: "UCS04787 - BA March Madness",
        active: 1,
        status: 2
      }),
      floatApiRow("raw_float_person_002", "18699903", {
        objectType: "person",
        people_id: 18699903,
        name: "Carlos Alija-Villanueva",
        job_title: "CREATIVE DIRECTOR",
        department: { name: "NYC Creative" },
        people_type_id: 2,
        active: 1
      }),
      floatApiRow("raw_float_person_003", "18699904", {
        objectType: "person",
        people_id: 18699904,
        name: "Laura Sampedro-Ibanez",
        job_title: "CREATIVE DIRECTOR",
        department: { name: "NYC Creative" },
        people_type_id: 2,
        active: 1
      }),
      floatApiRow("raw_float_task_002", "1709937673", {
        objectType: "task",
        task_id: 1709937673,
        project_id: 11048595,
        start_date: "2026-06-03",
        end_date: "2026-06-05",
        hours: 8,
        people_id: null,
        people_ids: [18699903, 18699904],
        status: 2,
        billable: 1
      })
    ]);

    expect(result.facts).toHaveLength(1);
    expect(result.facts[0]).toMatchObject({
      floatProjectId: "11048595",
      jobNumber: "UCS04787",
      taskId: "1709937673",
      person: "Multiple people",
      allocationClass: "pencil",
      expansionRule: "float_api_daily_hours_not_calendar_expanded"
    });
    expect(hoursValue(result.facts[0]!)).toBe(8);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MULTI_PERSON_SPLIT_AMBIGUITY",
          rawRowIds: ["raw_float_task_002"]
        })
      ])
    );
  });
});

function floatApiRow(id: string, sourceObjectId: string, raw: Readonly<Record<string, unknown>>): ArchivedRawSourceRow {
  return {
    kind: "raw_source_row",
    archiveStatus: "archived",
    id,
    batchId: "batch_float_api",
    source: "float",
    identity: {
      stableSourceRowKey: `float:${raw.objectType}:${sourceObjectId}`,
      sourceObjectId
    },
    raw,
    contentHash: `hash:${id}`,
    observedAt: "2026-05-21T00:00:00.000Z",
    sourceRefs: [
      {
        source: "float",
        sourceLayer: "float_raw",
        batchId: "batch_float_api",
        rawRowId: id,
        sourceObjectId
      }
    ]
  };
}
