import React from "react";

import type { DashboardScope } from "../../../lib";
import { ChatEvidenceTrace } from "./chat-evidence-trace";

export type ChatShellState = "closed" | "idle" | "working" | "evidence" | "error";

export type ChatShellEvidence = {
  sourcesChecked: string[];
  confidence: "high" | "medium" | "low";
  warnings: string[];
  unresolved?: string[];
};

export function ChatShell({
  scope,
  state,
  evidence,
  needsCodexReasons
}: {
  scope: DashboardScope;
  state: ChatShellState;
  evidence?: ChatShellEvidence;
  needsCodexReasons: string[];
}) {
  return React.createElement(
    "aside",
    { className: "chat-shell", "aria-label": "Dashboard Chat" },
    React.createElement("div", { className: "table-title" }, React.createElement("h2", null, "Dashboard Chat"), React.createElement("span", { className: "status-pill" }, labelForState(state))),
    React.createElement("p", { className: "detail-scope" }, scopeLine(scope)),
    evidenceSection(evidence),
    React.createElement(
      "section",
      { className: "needs-codex-panel" },
      React.createElement("strong", null, "Needs Codex"),
      React.createElement(
        "ul",
        null,
        needsCodexReasons.map((reason) => React.createElement("li", { key: reason }, reason))
      )
    )
  );
}

function evidenceSection(evidence: ChatShellEvidence | undefined) {
  if (evidence === undefined) {
    return React.createElement("p", null, "Ask a scoped question to build a read-only evidence pack in Phase 7.");
  }

  return React.createElement(ChatEvidenceTrace, { evidence });
}

function labelForState(state: ChatShellState): string {
  if (state === "working") return "Working";
  if (state === "evidence") return "Evidence ready";
  if (state === "error") return "Error";
  if (state === "closed") return "Closed";
  return "Idle";
}

function scopeLine(scope: DashboardScope): string {
  return [scope.office, scope.from, scope.to, scope.department, scope.role, scope.client, scope.jobNumber]
    .filter(Boolean)
    .join(" / ");
}
