import React from "react";

import type { DashboardScope } from "../../lib";
import { scopedHref } from "../../lib";

const quickRanges = [
  ["Full year", "2026-01-01", "2026-12-31"],
  ["Q1", "2026-01-01", "2026-03-31"],
  ["Q2", "2026-04-01", "2026-06-30"],
  ["Q3", "2026-07-01", "2026-09-30"],
  ["Q4", "2026-10-01", "2026-12-31"]
] as const;

const months = [
  ["Jan", "2026-01-01", "2026-01-31"],
  ["Feb", "2026-02-01", "2026-02-28"],
  ["Mar", "2026-03-01", "2026-03-31"],
  ["Apr", "2026-04-01", "2026-04-30"],
  ["May", "2026-05-01", "2026-05-31"],
  ["Jun", "2026-06-01", "2026-06-30"],
  ["Jul", "2026-07-01", "2026-07-31"],
  ["Aug", "2026-08-01", "2026-08-31"],
  ["Sep", "2026-09-01", "2026-09-30"],
  ["Oct", "2026-10-01", "2026-10-31"],
  ["Nov", "2026-11-01", "2026-11-30"],
  ["Dec", "2026-12-01", "2026-12-31"]
] as const;

export function TimeFilterControls({
  basePath,
  extraParams = {},
  scope
}: {
  readonly basePath: string;
  readonly extraParams?: Readonly<Record<string, string | undefined>>;
  readonly scope: DashboardScope;
}) {
  return React.createElement(
    "section",
    { className: "time-filter-controls", "aria-label": "Time filters" },
    React.createElement("span", { className: "time-filter-label" }, "Quick"),
    ...quickRanges.map(([label, from, to]) => rangeLink(basePath, scope, extraParams, label, from, to)),
    React.createElement("span", { className: "time-filter-label" }, "Month"),
    ...months.map(([label, from, to]) => rangeLink(basePath, scope, extraParams, label, from, to)),
    React.createElement("span", { className: "time-filter-label" }, "Custom"),
    React.createElement("input", {
      "aria-label": "Custom from date",
      name: "from",
      readOnly: true,
      type: "date",
      value: scope.from
    }),
    React.createElement("input", {
      "aria-label": "Custom to date",
      name: "to",
      readOnly: true,
      type: "date",
      value: scope.to
    })
  );
}

function rangeLink(
  basePath: string,
  scope: DashboardScope,
  extraParams: Readonly<Record<string, string | undefined>>,
  label: string,
  from: string,
  to: string
) {
  const active = scope.from === from && scope.to === to;

  return React.createElement(
    "a",
    {
      "aria-current": active ? "page" : undefined,
      className: active ? "active" : undefined,
      href: hrefWithExtraParams(scopedHref(basePath, scope, { from, to }), extraParams),
      key: `${label}:${from}:${to}`
    },
    label
  );
}

function hrefWithExtraParams(href: string, extraParams: Readonly<Record<string, string | undefined>>): string {
  const [path = "", query = ""] = href.split("?");
  const params = new URLSearchParams(query);

  for (const [key, value] of Object.entries(extraParams)) {
    if (value === undefined || value.trim() === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const nextQuery = params.toString();
  return nextQuery === "" ? path : `${path}?${nextQuery}`;
}
