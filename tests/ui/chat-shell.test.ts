import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ChatShell } from "../../src/components/dashboard/chat/chat-shell";

describe("P6-F chat shell", () => {
  test("renders idle, working, evidence, warning, confidence, and Needs Codex states without investigating", () => {
    const html = renderToStaticMarkup(
      React.createElement(ChatShell, {
        scope: {
          office: "LDN",
          from: "2026-01-01",
          to: "2026-03-31",
          department: "Design"
        },
        state: "working",
        evidence: {
          sourcesChecked: ["display contract", "visible rows", "Float reconciliation"],
          confidence: "medium",
          warnings: ["Live Float API requires Codex or Phase 7 tools."],
          unresolved: ["MISSING_FLOAT_EXPORT"]
        },
        needsCodexReasons: ["repo inspection", "browser testing", "sync", "deployment", "stakeholder communication"]
      })
    );

    expect(html).toContain("Dashboard Chat");
    expect(html).toContain("Working");
    expect(html).toContain("LDN");
    expect(html).toContain("Design");
    expect(html).toContain("display contract");
    expect(html).toContain("Float reconciliation");
    expect(html).toContain("Unresolved checks");
    expect(html).toContain("MISSING_FLOAT_EXPORT");
    expect(html).toContain("medium");
    expect(html).toContain("Needs Codex");
    expect(html).toContain("repo inspection");
    expect(html).toContain("browser testing");
    expect(html).toContain("deployment");
    expect(html).not.toContain("source fixed");
  });
});
