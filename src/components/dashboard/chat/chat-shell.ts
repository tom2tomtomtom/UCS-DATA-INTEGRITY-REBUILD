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
    chatForm(scope),
    quickQuestions(scope),
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

function chatForm(scope: DashboardScope) {
  return React.createElement(
    "form",
    { action: "/api/chat", className: "chat-form", method: "post" },
    React.createElement("textarea", {
      "aria-label": "Ask the dashboard chat",
      name: "message",
      placeholder: "Ask a scoped evidence question...",
      rows: 4
    }),
    React.createElement("input", { name: "scope[office]", type: "hidden", value: scope.office }),
    React.createElement("input", { name: "scope[from]", type: "hidden", value: scope.from }),
    React.createElement("input", { name: "scope[to]", type: "hidden", value: scope.to }),
    ...optionalScopeInputs(scope),
    React.createElement("button", { type: "submit" }, "Ask read-only chat")
  );
}

function quickQuestions(scope: DashboardScope) {
  const hrefBase = chatDemoHref(scope);
  const questions = [
    ["What errors can you see?", "what errors can you see"],
    ["Why is this lower than Float?", "why is this lower than Float"],
    ["Does this need Codex?", "does this need Codex"]
  ] as const;

  return React.createElement(
    "nav",
    { className: "chat-quick-questions", "aria-label": "Suggested chat questions" },
    ...questions.map(([label, question]) =>
      React.createElement("a", { href: `${hrefBase}&question=${encodeURIComponent(question)}`, key: label }, label)
    )
  );
}

function optionalScopeInputs(scope: DashboardScope) {
  const entries = {
    department: scope.department,
    role: scope.role,
    client: scope.client,
    search: scope.search,
    jobNumber: scope.jobNumber,
    floatProjectId: scope.floatProjectId
  };

  return Object.entries(entries).flatMap(([key, value]) =>
    value === undefined || value.trim() === "" ? [] : React.createElement("input", { key, name: `scope[${key}]`, type: "hidden", value })
  );
}

function chatDemoHref(scope: DashboardScope): string {
  const params = new URLSearchParams();
  params.set("office", scope.office);
  params.set("from", scope.from);
  params.set("to", scope.to);

  for (const [key, value] of Object.entries({
    department: scope.department,
    role: scope.role,
    client: scope.client,
    search: scope.search,
    jobNumber: scope.jobNumber,
    floatProjectId: scope.floatProjectId
  })) {
    if (value !== undefined && value.trim() !== "") {
      params.set(key, value);
    }
  }

  params.set("state", "working");
  return `/dashboard/chat-demo?${params.toString()}`;
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
