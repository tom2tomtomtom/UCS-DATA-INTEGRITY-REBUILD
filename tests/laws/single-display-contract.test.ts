import { describe, expect, test } from "vitest";

import { executeReadOnlyTool } from "../../src/lib/chat";
import { getFixtureDashboardContract } from "../../src/lib/ui/fixture-contract";

describe("Law 3: one display contract owns all visible numbers", () => {
  test.todo("derives hero totals from the display contract");
  test.todo("derives Projects footer totals from display contract rows");
  test.todo("derives CSV rows from the display contract");
  test.todo("derives project detail values from the scoped display contract row");

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
