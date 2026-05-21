import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import ChatDemoPage from "../../app/dashboard/chat-demo/page";
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
    expect(html).toContain("Ask read-only chat");
    expect(html).toContain("action=\"/dashboard/chat-demo\" method=\"get\"");
    expect(html).toContain("Ask a scoped evidence question");
    expect(html).toContain("What errors can you see?");
    expect(html).toContain("Why is this lower than Float?");
    expect(html).toContain("Does this need Codex?");
    expect(html).toContain("type=\"hidden\" name=\"department\" value=\"Design\"");
    expect(html).toContain("type=\"hidden\" name=\"state\" value=\"working\"");
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

  test("renders closed and idle fixture states without evidence claims", () => {
    const scope = {
      office: "LDN",
      from: "2026-01-01",
      to: "2026-03-31",
      department: "Design"
    } as const;
    const closedHtml = renderToStaticMarkup(
      React.createElement(ChatShell, {
        scope,
        state: "closed",
        needsCodexReasons: ["repo inspection"]
      })
    );
    const idleHtml = renderToStaticMarkup(
      React.createElement(ChatShell, {
        scope,
        state: "idle",
        needsCodexReasons: ["repo inspection"]
      })
    );

    expect(closedHtml).toContain("Closed");
    expect(closedHtml).toContain("Ask a scoped question");
    expect(idleHtml).toContain("Idle");
    expect(idleHtml).toContain("Ask a scoped question");
    expect(idleHtml).not.toContain("Evidence ready");
  });

  test("chat demo runs a scoped evidence investigation when a question is submitted", async () => {
    const html = renderToStaticMarkup(
      await ChatDemoPage({
        searchParams: Promise.resolve({
          office: "LDN",
          from: "2026-01-01",
          to: "2026-03-31",
          department: "Design",
          question: "what errors can you see"
        })
      })
    );

    expect(html).toContain("Dashboard Chat");
    expect(html).toContain("Evidence ready");
    expect(html).toContain("Question:");
    expect(html).toContain("what errors can you see");
    expect(html).toContain("Playbook: dashboard_scan");
    expect(html).toContain("Sources checked");
    expect(html).toContain("float_visible");
    expect(html).toContain("UCS04787 raw/cache reconciliation");
    expect(html).toContain("Unresolved checks");
    expect(html).toContain("TOOL_NOT_FIXTURE_BACKED");
    expect(html).toContain("Needs Codex");
    expect(html).not.toContain("source fixed");
  });
});
