import React from "react";

export type ReadOnlyRouteEvidenceItem = {
  readonly label: string;
  readonly detail: string;
  readonly href?: string;
  readonly meta?: readonly string[];
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
          item.meta === undefined || item.meta.length === 0
            ? null
            : React.createElement("small", null, item.meta.join(" / ")),
          React.createElement("span", null, item.detail),
          item.href === undefined ? null : React.createElement("a", { href: item.href }, "Open evidence")
        )
      )
    )
  );
}
