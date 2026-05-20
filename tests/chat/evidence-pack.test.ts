import { describe, expect, test } from "vitest";

import {
  createEvidencePack,
  evidenceEventFromPack,
  needsCodexForTriggers,
  recordToolError
} from "../../src/lib/chat";
import type { DashboardScope } from "../../src/lib";

const scope: DashboardScope = {
  office: "LDN",
  from: "2026-01-01",
  to: "2026-03-31",
  department: "Design"
};

describe("P7-A chat evidence pack", () => {
  test("creates a normalised evidence pack with source-traceable facts and checks", () => {
    const pack = createEvidencePack({
      question: "why is UCS04787 different?",
      scope,
      playbook: "float_hours_mismatch",
      sourceLayers: ["float_visible", "float_raw"],
      toolsRun: [
        {
          tool: "get_display_contract",
          label: "Read visible display contract",
          status: "pass",
          sourceLayers: ["float_visible"]
        }
      ],
      facts: [
        {
          id: "fact:visible:ucs04787",
          label: "Visible Float hours",
          sourceLayer: "float_visible",
          contractRowId: "project:sold:UCS04787",
          value: { kind: "hours", value: 861, unit: "decimal_hours" },
          sourceRefs: [{ source: "float", sourceLayer: "float_visible", rawRowId: "fixture-float-visible-ucs04787" }]
        }
      ],
      checks: [
        {
          id: "check:raw-visible",
          label: "Raw Float compared with visible dashboard hours",
          status: "warn",
          sourceLayers: ["float_raw", "float_visible"],
          message: "Raw and visible Float hours do not match."
        }
      ]
    });

    expect(pack.question).toBe("why is UCS04787 different?");
    expect(pack.scope.department).toBe("Design");
    expect(pack.confidence).toBe("medium");
    expect(pack.facts[0]?.sourceLayer).toBe("float_visible");
    expect(pack.facts[0]?.value).toMatchObject({ kind: "hours", value: 861 });
    expect(pack.checks[0]?.status).toBe("warn");
    expect(pack.needsCodex.needed).toBe(false);
  });

  test("turns tool errors into warnings, unresolved checks, low confidence, and Needs Codex", () => {
    const pack = createEvidencePack({
      question: "check against Google sheets",
      scope,
      playbook: "fee_sheet_sold_hours_mismatch"
    });

    const next = recordToolError(pack, {
      tool: "inspect_fee_sheet",
      label: "Inspect fee sheet evidence",
      message: "Fee sheet fixture is not indexed yet."
    });

    expect(next.toolsRun).toContainEqual(
      expect.objectContaining({
        tool: "inspect_fee_sheet",
        status: "error"
      })
    );
    expect(next.warnings).toContain("inspect_fee_sheet failed: Fee sheet fixture is not indexed yet.");
    expect(next.unresolved[0]).toMatchObject({
      code: "TOOL_ERROR",
      requiredTool: "inspect_fee_sheet"
    });
    expect(next.confidence).toBe("low");
    expect(next.needsCodex).toMatchObject({
      needed: true,
      triggers: expect.arrayContaining(["incomplete_evidence"])
    });
  });

  test("maps out-of-bound requests to Needs Codex decisions", () => {
    const decision = needsCodexForTriggers(["code", "browser", "mutation", "sync", "deploy", "stakeholder"]);

    expect(decision).toMatchObject({
      needed: true,
      triggers: ["code", "browser", "mutation", "sync", "deploy", "stakeholder"]
    });
    expect(decision.reason).toContain("outside chat");
    expect(decision.suggestedCodexTask).toContain("Use Codex");
  });

  test("creates a compact evidence stream event without dropping warnings", () => {
    const pack = createEvidencePack({
      question: "what errors can you see?",
      scope,
      playbook: "dashboard_scan",
      sourceLayers: ["sold", "float_visible"],
      warnings: ["PCS00250 has cache without raw task rows."]
    });

    const event = evidenceEventFromPack(pack);

    expect(event).toEqual({
      type: "evidence",
      sourcesChecked: ["sold", "float_visible"],
      confidence: "medium",
      warnings: ["PCS00250 has cache without raw task rows."]
    });
  });
});
