import React from "react";

export type ReadOnlyRouteEvidenceItem = {
  readonly label: string;
  readonly detail: string;
};

export function ReadOnlyRouteSurface({
  title,
  status,
  evidenceItems
}: {
  readonly title: string;
  readonly status: string;
  readonly evidenceItems: readonly ReadOnlyRouteEvidenceItem[];
}) {
  return React.createElement(
    "section",
    { className: "quality-surface" },
    React.createElement("h2", null, title),
    React.createElement("p", { className: "detail-scope" }, status),
    React.createElement(
      "ul",
      { className: "evidence-list" },
      evidenceItems.map((item) =>
        React.createElement(
          "li",
          { key: item.label },
          React.createElement("strong", null, item.label),
          React.createElement("span", null, item.detail)
        )
      )
    )
  );
}
