# Tolerance, Units, Currency, And Time Policy

## Purpose

Tolerances are where real bugs go to hide.

This policy defines numeric units, date handling, and acceptable deltas before implementation begins.

## Currency

Rules:

- preserve original currency,
- preserve original amount,
- preserve GBP conversion rate,
- preserve conversion source,
- preserve conversion timestamp,
- display GBP where the dashboard requires comparable totals.

Required fields:

```ts
type MoneyValue = {
  amountOriginal: number;
  currencyOriginal: "GBP" | "USD" | "EUR" | "SEK" | "UNKNOWN";
  amountGbp: number;
  fxRateToGbp: number;
  fxSource: string;
  fxCapturedAt: string;
};
```

Do not:

- overwrite original currency,
- convert without source rate trace,
- compare original and GBP amounts as if same unit,
- round before aggregation.

## Hours

Rules:

- store decimal hours,
- preserve raw source hours,
- preserve expanded/calculated hours separately,
- preserve person-split hours separately,
- display rounded values only at the UI edge.

Do not:

- round per row before summing,
- compare raw Float task span hours to expanded monthly allocation hours without label,
- treat missing role hours as zero role hours.

## Dates

Canonical date rules:

- source dates are parsed to ISO date strings,
- month facts use first day of month,
- dashboard date ranges are inclusive,
- timezone is explicit when converting timestamps,
- source pull timestamps are UTC,
- user-facing freshness can render local time.

Do not:

- use browser timezone to define source month,
- compare full-year source exports to Q1 dashboard scope,
- infer month from text when source date exists.

## Tolerances

Default tolerances:

| Metric | Tolerance | Notes |
|---|---:|---|
| GBP | 1 | after aggregation |
| Hours | 0.1 | after aggregation unless source export rounds differently |
| Display formatting | 0.5 | only for formatted UI value |

Rules:

- Tolerance applies after aggregation, not per row.
- Any tolerance above default needs an explicit warning and test.
- Tolerance cannot be widened to make a named regression pass.
- A one-person workday difference is not rounding noise.

## PASS, WARN, FAIL

`PASS`:

- supported metric agrees within tolerance.

`WARN`:

- source supports the metric but source semantics differ,
- source export rounds differently,
- source is stale,
- source is unsupported for the active slice.

`FAIL`:

- dashboard, contract, cache, parser, UI, CSV, or chat disagrees with source evidence outside tolerance.

## Required Tests

- currency conversion keeps original and GBP values,
- aggregation rounds only at display edge,
- Q1 and full-year scopes do not mix,
- USA source currency does not become GBP without FX evidence,
- Float export rounded hours compare with explicit tolerance,
- a 7.5 or 8 hour delta does not pass as rounding noise by default.
