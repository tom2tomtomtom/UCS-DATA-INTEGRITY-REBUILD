import { describe, expect, test } from "vitest";

import { executeReadOnlyTool, listReadOnlyToolNames, runInvestigation } from "../../src/lib/chat";
import type { DashboardScope } from "../../src/lib";

const scope: DashboardScope = {
  office: "LDN",
  from: "2026-01-01",
  to: "2026-03-31"
};

describe("P7-C read-only tactical tools and orchestrator", () => {
  test("inspect_project returns the visible dashboard contract row as evidence", () => {
    const result = executeReadOnlyTool({
      tool: "inspect_project",
      scope,
      jobNumber: "UCS04787"
    });

    expect(result.status).toBe("pass");
    expect(result.contractRows[0]).toMatchObject({
      jobNumber: "UCS04787",
      sourceClient: "British Airways"
    });
    expect(result.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contractRowId: result.contractRows[0]?.id,
          sourceLayer: "float_visible"
        })
      ])
    );
  });

  test("Float mismatch investigation runs required serial tools and marks missing export unresolved", () => {
    const pack = runInvestigation({
      question: "is UCS04787 a dashboard problem or Float source mismatch?",
      scope,
      jobNumber: "UCS04787"
    });

    expect(pack.playbook).toBe("float_hours_mismatch");
    expect(pack.toolsRun.map((run) => run.tool)).toEqual([
      "get_display_contract",
      "inspect_project",
      "inspect_float_raw_cache_visible",
      "parse_pasted_float_export",
      "compare_float_export_to_contract"
    ]);
    expect(pack.sourceLayers).toEqual(expect.arrayContaining(["float_raw", "float_visible"]));
    expect(pack.unresolved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_FLOAT_EXPORT",
          requiredTool: "parse_pasted_float_export"
        })
      ])
    );
    expect(pack.confidence).toBe("low");
    expect(pack.needsCodex.triggers).toContain("incomplete_evidence");
  });

  test("tool failures become warnings and unresolved evidence rather than thrown answers", () => {
    const pack = runInvestigation({
      question: "check against Google sheets",
      scope,
      simulateToolErrors: {
        inspect_fee_sheet: "Fee sheet fixture is unavailable."
      }
    });

    expect(pack.toolsRun).toContainEqual(
      expect.objectContaining({
        tool: "inspect_fee_sheet",
        status: "error"
      })
    );
    expect(pack.warnings).toContain("inspect_fee_sheet failed: Fee sheet fixture is unavailable.");
    expect(pack.unresolved).toEqual(expect.arrayContaining([expect.objectContaining({ code: "TOOL_ERROR" })]));
    expect(pack.confidence).toBe("low");
  });

  test("tool registry exposes read-only tools only", () => {
    const toolNames = listReadOnlyToolNames();

    expect(toolNames).toEqual(expect.arrayContaining(["get_display_contract", "inspect_project"]));
    expect(toolNames).not.toEqual(expect.arrayContaining(["archive", "sync", "deploy", "write_sql"]));
  });

  test("required tools without fixture evidence become unresolved instead of passing empty", () => {
    const pack = runInvestigation({
      question: "what errors can you see?",
      scope
    });

    expect(pack.toolsRun).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tool: "inspect_warning_lifecycle",
          status: "unresolved"
        }),
        expect.objectContaining({
          tool: "run_integrity_check",
          status: "unresolved"
        })
      ])
    );
    expect(pack.unresolved).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "TOOL_NOT_FIXTURE_BACKED", requiredTool: "inspect_warning_lifecycle" }),
        expect.objectContaining({ code: "TOOL_NOT_FIXTURE_BACKED", requiredTool: "run_integrity_check" })
      ])
    );
    expect(pack.confidence).toBe("low");
  });
});
