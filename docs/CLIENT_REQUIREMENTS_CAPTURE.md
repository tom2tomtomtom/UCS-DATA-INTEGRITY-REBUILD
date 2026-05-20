# Client Requirements Capture

This document translates Sian, Yunni, Jade, and Uncommon's actual language into rebuild requirements.

It must be updated from emails, vault notes, call notes, screenshots, and live dashboard complaints.

## Why This Exists

The rebuild is not only a technical correction. It must match how the client decides whether the dashboard is trustworthy.

When Sian says a view is wrong, she usually means:

- the same scope gives different numbers in two places,
- a total cannot be drilled into,
- pipeline appears where it cannot differentiate,
- CSV and on-screen values do not reconcile,
- a source-only row is hidden or impossible to identify.

When Yunni says Float is wrong, she usually means:

- Float's own UI/export does not match dashboard hours,
- the wrong Float job was joined,
- duplicates/manual jobs pollute exports,
- archive state is ignored,
- roles/people are missing so she cannot see whose hours are missing,
- the diagnostic page does not explain where hours are pulling from.

When Jade needs confidence, she usually needs:

- source sheet rows preserved,
- pipeline and production revenue surfaced,
- exact owner/source problem visible,
- no hidden source corrections,
- clear instruction on what a human needs to fix.

Agent/vault/email audit note:

- Gmail snippets and vault notes show the client does not only want a "correct report". They want a working investigation surface where wrong-looking numbers explain themselves.
- Sian's recurring attack path is variance and reconciliation.
- Yunni's recurring attack path is Float traceability.
- Jade's recurring need is source ownership and source-row visibility.

## Evidence Log

Each entry should use this shape:

```txt
Date:
Source:
Person:
Quote or paraphrase:
Dashboard surface:
Data stream:
Implied requirement:
Required test:
Open question:
```

## Recurring Pain Points

### Same Scope, Different Number

Evidence:

- `/Users/tommyhyde/Tom-Brain/Business/Uncommon Creative Engagement.md`
- May 14 and May 18 notes.

Client signal:

- Sian checks whether dashboard totals, Projects rows, and CSV exports match for the same scope.
- The May 18 note records `npm run sian:check` becoming a permanent repo check after Sian's variance-sheet approach.
- The May 14 note records CSV export still misaligned per project line after month/year views looked correct.

Requirement:

- The rebuild must treat "same scope, same number" as a product law.
- Dashboard, Projects, CSV, rollups, detail, chat, and verify must use one display contract.

Required test:

- Given a scope such as LDN Q1 Design, dashboard rollup, Projects footer, visible row sum, CSV sum, and project detail must reconcile for supported metrics.

### Pipeline And Production Revenue Must Be Visible But Not Misattributed

Evidence:

- `/Users/tommyhyde/Tom-Brain/Business/Uncommon Creative Engagement.md`
- May 6 call notes and May 12 commits.

Client signal:

- Sian defined Sold as fee-sheet V-tab plus production revenue.
- Pipeline is standalone and does not roll into department.
- Blank/TBC pipeline bucket carries project name.

Requirement:

- Pipeline stays pipeline.
- Production revenue can contribute to sold-equivalent headline revenue where agreed, but must not pretend to support department or role attribution when the source cannot.
- TBC and blank-job rows remain visible with source identity.

Required test:

- Department and role scopes must mark pipeline and production revenue unsupported unless source attribution exists.
- TBC rows must preserve source-row identity.

### Float Must Explain Where Hours Pull From

Evidence:

- `/Users/tommyhyde/Tom-Brain/Business/Deal Tracker.md`
- `/Users/tommyhyde/Tom-Brain/Business/Uncommon Creative Engagement.md`

Client signal:

- Yunni flagged duplicated job numbers, wrong Float joins, project view missing Float hours, and hours disappearing in Department Roll Up.
- Yunni needs to know whose hours are missing, not only the total delta.

Requirement:

- Float diagnostics must show fee-sheet Float ID, raw Float tasks, people/role evidence, cache rows, visible row, export comparison, duplicate candidates, and unresolved classifications.

Required test:

- UCS04787, UCS05186, UCS04154, PCS00250, BT raw/cache mismatch.

### Search And Archive Are Trust Features, Not Nice-To-Haves

Evidence:

- `/Users/tommyhyde/Tom-Brain/Business/Deal Tracker.md`
- `/Users/tommyhyde/Tom-Brain/Business/BD Pipeline.md`
- `/Users/tommyhyde/Tom-Brain/Business/Uncommon Creative Engagement.md`

Client signal:

- Search reordering instead of filtering was logged as an open bug.
- Archive checkbox/button failure was proven by Yunni video.
- Sian needs source-only and stray Float rows identifiable before archive decisions.

Requirement:

- Search must filter.
- Archive actions must only apply to mutable project records.
- Source-only rows must be identifiable and not silently removed.

Required test:

- Search filters visible rows.
- Archive checkbox plus button works for mutable rows.
- Archive controls are absent or disabled with explanation for source-only rows.

### Sheet Health Must Check What Drives The Dashboard

Evidence:

- `/Users/tommyhyde/Tom-Brain/Business/Uncommon Creative Engagement.md`

Client signal:

- Yunni checked fee sheets flagged by Sheet Health and found no formula errors in the totals feeding Client Summary.

Requirement:

- Sheet Health must check the exact cells and parser layers that drive displayed metrics.
- It must not flag unrelated formulas as dashboard-breaking.

Required test:

- Formula-health fixture where irrelevant formula errors exist but dashboard-driving cells are clean.

## Acceptance Criteria In Client Language

- "Truthfully represent what's on all the sheets and help us spot where the mistakes are."
- "Same scope, same metric, same number."
- "The dashboard is a spotter, not the reporter."
- "Where sources disagree, the disagreement is the signal."
- "Do not fix human source data in code."
- "If a row has bad metadata but a real value, show it."
- "Archive is a dashboard overlay, not a source edit."
- Same scope, same number.
- Pipeline and production revenue must not disappear between month/year views, Projects, and CSV.
- TBC and blank-job pipeline rows need a project name or source identity.
- Float hours need traceability to Float's own jobs, tasks, people, and exports.
- Source-only rows need to be identifiable, not hidden.
- Dashboard warnings should tell the team what to fix at source.
- If the dashboard cannot prove a number, it should say unsupported or unresolved.

## UI Expectations

- Keep department, role, month, client, Projects, project detail, Float, and Data Quality workflows.
- Monthly Rollup is one of Sian's main working views. It must show flags that drill into the exact reason a number looks off.
- Projects is the investigation list. It needs office, period, search, CSV, source totals, row type, and archive visibility.
- Project drilldown must show source streams side by side, with source links where available.
- Filters persist across navigation.
- Filters need clear reset and all-project controls.
- Drilldowns preserve office, date, department, role, client, and project scope.
- CSV mirrors the visible Projects view.
- Search filters the table.
- Source-only rows have row-type labels.
- Archive controls are clear and only shown where they can work.
- Data integrity warnings appear in the product, not only in scripts.
- Practical workflow affordances matter: sorting, search, CSV, archive/dismiss persistence, glossary/source explanations, and change summaries are trust features.

## Data Integrity Expectations

- Four streams remain visible: fee-sheet sold, pipeline, production revenue, Float.
- The dashboard must surface contradictions rather than correcting them.
- Raw source rows remain traceable.
- Raw source values are sacred. No hidden dedupe, no invented winner, no unit conversion that changes meaning.
- Source-only rows remain visible.
- Unsupported source cuts are labelled.
- Float raw/cache/visible/export layers are separated.
- Role and department claims require source support.
- Sheet health checks target displayed metric inputs.
- Source ownership must be visible: Pipeline and Production Revenue are Jade-owned, fee tracker and fee sheets are Yunni/project-owner-owned, Float is Yunni/resourcing-owned.

## Phrases To Encode Into Tests

- "same scope, same number"
- "same scope, same metric, same number"
- "pipeline is standalone"
- "Float always surfaces"
- "truthfully represent what's on all the sheets"
- "spot where the mistakes are"
- "dashboard is a spotter, not the reporter"
- "where sources disagree, the disagreement is the signal"
- "CSV export matches Projects view"
- "search filters, not reorders"
- "where are the hours pulling from?"
- "wrong Float ID"
- "source-only row is identifiable"
- "unsupported is not zero"
- "archive is a dashboard overlay, not a source edit"

## Contradictions Or Open Questions

- Sold definition must remain explicit: fee-sheet sold plus production revenue where the business rule says production revenue belongs in Sold.
- Pipeline appears in overall views but does not support department/role attribution. UI must make this clear.
- Float UI/export totals may use semantics that differ from dashboard expansion. The app must classify rather than guess.
- Archive can be both a user action and a data-quality signal. Archived real data still surfaces.
- Some current notes mention "zero-data rows suppressed". The rebuild must define suppression carefully so it never hides source-only rows with real value.
- The product pivot must be preserved: early April language was commercial dashboard, later May language is data integrity dashboard. The app can still support forecasting views, but those views must be source-labelled rather than pretending to be certified finance truth.
- Float should be diagnostic and complete without becoming the single headline finance truth.
- If per-job resync exists, it must be an explicit authorised admin action. It must never be a side effect of an integrity test or chat answer.
