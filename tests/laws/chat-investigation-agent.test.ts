import { describe, expect, test } from "vitest";

import { routePlaybook } from "../../src/lib/chat";

describe("Chat investigation agent", () => {
  test("rejects trap prompts that require unsupported claims", () => {
    const playbook = routePlaybook("does USA00262 have zero sold hours?");

    expect(playbook.id).toBe("fee_sheet_sold_hours_mismatch");
    expect(playbook.forbiddenClaims).toContain("zero_hours_when_source_or_contract_nonzero");
  });

  test.todo("surfaces tool errors in the investigation evidence");
  test.todo("reports unsupported checks as unsupported, not zero");

  test("returns Needs Codex for tasks outside chat's read-only evidence boundary", () => {
    const playbook = routePlaybook("archive this project");

    expect(playbook.id).toBe("needs_codex_handoff");
    expect(playbook.needsCodexTriggers).toContain("mutation");
  });
});
