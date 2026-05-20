import React from "react";

import type { ChatShellEvidence } from "./chat-shell";

export function ChatEvidenceTrace({ evidence }: { evidence: ChatShellEvidence }) {
  return React.createElement(
    "section",
    { className: "chat-evidence" },
    React.createElement("strong", null, `Confidence: ${evidence.confidence}`),
    listSection("Sources checked", evidence.sourcesChecked),
    listSection("Warnings", evidence.warnings),
    evidence.unresolved !== undefined && evidence.unresolved.length > 0
      ? listSection("Unresolved checks", evidence.unresolved)
      : null
  );
}

function listSection(title: string, values: readonly string[]) {
  return React.createElement(
    React.Fragment,
    { key: title },
    React.createElement("h3", null, title),
    React.createElement(
      "ul",
      null,
      values.length === 0
        ? React.createElement("li", null, "None")
        : values.map((value) => React.createElement("li", { key: value }, value))
    )
  );
}
