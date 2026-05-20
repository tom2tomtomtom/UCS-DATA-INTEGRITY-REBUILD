# Immutable Laws

These laws are the product. The UI is how users navigate them.

No code path may bypass them. No page, export, chat answer, verifier, diagnostic, or script may answer a dashboard question outside these laws.

## Law 1: Every Real Source Row Surfaces

**Invariant:** Every non-empty source row is stored, parsed if possible, and surfaced either as a matched row or a source-only row.

Allowed drop:

- a row with no job number,
- no project name,
- no client,
- no date,
- no amount,
- no hours,
- no useful source identifier.

Banned shortcuts:

- dropping rows because they are archived,
- dropping rows because they are TBC,
- dropping rows because they are inactive,
- dropping rows because they are provisional,
- dropping rows because they do not match the fee tracker,
- dropping rows because they have zero fee but nonzero hours,
- dropping rows because another source appears to supersede them.

Required evidence:

- raw source batch,
- raw source row ID,
- parser result or parser warning,
- display row or explicit source-only warning.

Required tests:

- source fixtures with unmatched, archived, TBC, inactive, zero-fee/nonzero-hour, no-job, and duplicate rows,
- real-data dropped-row report,
- CI failure on unexplained dropped rows.

Regression examples:

- pipeline TBC rows collapse into one hidden bucket,
- archived production revenue appears in hero but not Projects,
- Float-only placeholder work is absent from the dashboard.

## Law 2: The Dashboard Spots Mistakes, It Does Not Correct Them

**Invariant:** If two sources disagree, the disagreement is visible.

Client language:

- The dashboard is a spotter, not the reporter.
- Where sources disagree, the disagreement is the signal.
- Do not fix human source data in code.

Banned shortcuts:

- choosing CLIENT SUMMARY over V-tabs without preserving the V-tab evidence,
- choosing V-tabs over CLIENT SUMMARY without preserving CLIENT SUMMARY evidence,
- choosing confirmed production revenue over negotiating production revenue,
- choosing active Float over archived Float,
- choosing the manually-created Float duplicate over the fee-sheet Float ID,
- silently merging duplicate jobs.

Required evidence:

- both source values,
- source layer labels,
- conflict classification,
- affected dashboard scope,
- warning shown to the user.

Required tests:

- CLIENT SUMMARY vs V-tab mismatch,
- production status collision,
- duplicate Float job,
- duplicate fee tracker job,
- cross-office duplicate job.

Regression examples:

- USA fee sheet hours are present but dashboard claims zero sold hours,
- a chat answer says "dashboard error" before proving source-to-dashboard mismatch.

## Law 3: One Display Contract Owns All Visible Numbers

**Invariant:** Hero, rollups, Projects, project detail, CSV, approval, verification, and chat all read from the same display contract.

Banned shortcuts:

- page-local totals,
- page-local filtering,
- CSV-specific row builders,
- chat-specific legacy selectors,
- approval scripts using a different model from the UI,
- diagnostics promoted into product truth.

Required evidence:

- a pure `buildDashboardDisplayContract(scope, facts)` function,
- a single exported contract type,
- usage references from all dashboard surfaces.

Required tests:

- hero equals contract total,
- Projects footer equals contract rows,
- CSV equals contract rows,
- project detail equals scoped contract row,
- chat evidence pack references contract row.

Regression examples:

- LDN Q1 Design rollup says one number, Projects drilldown says another,
- CSV reconciles while screen totals do not.

## Law 4: Scope Is Explicit And Preserved

**Invariant:** Every number knows its office, date range, and active slice.

Canonical scope:

```ts
type DashboardScope = {
  office: "LDN" | "USA" | "UCX" | "ALL";
  from: string;
  to: string;
  department?: string;
  role?: string;
  client?: string;
  search?: string;
  jobNumber?: string;
  floatProjectId?: string;
};
```

Banned shortcuts:

- using `search` as client drilldown,
- losing office/date params on links,
- showing full-project totals after clicking a scoped row,
- comparing full-year Float export to Q1 dashboard scope,
- inferring office only from project header when row-level office exists.

Required evidence:

- URL state,
- active scope object,
- source capability check,
- display contract generated for that exact scope.

Required tests:

- department to Projects preserves office/date/department,
- Projects to project detail preserves all active scope,
- exact client drilldown does not use fuzzy search,
- full-year and Q1 scopes produce separate evidence.

Regression examples:

- Sian clicks LDN Q1 Design and sees 9k in one place and 10m in another,
- project detail shows full-year Float while the user is looking at Q1.

## Law 5: Unsupported Is Not Zero

**Invariant:** A field that the source cannot support is displayed as unsupported, not as zero.

Banned shortcuts:

- blank cell for unsupported,
- zero for unsupported,
- hiding unsupported warnings after filtering,
- calculating pipeline by department when source has no department,
- calculating production revenue by role when source has no role.

Required evidence:

- source capability matrix,
- unsupported metric record,
- visible label or warning.

Required tests:

- pipeline in department scope is unsupported,
- production revenue in role scope is unsupported,
- role allocation absent is unsupported, not zero,
- Float-only rows with no fee-sheet role data are clearly labelled.

Regression examples:

- project detail says sold hours are zero when source rows are present but not role-attributed,
- Department Roll Up shows pipeline as if it can differentiate department.

## Law 6: Raw Rows Are Evidence, Not Automatic Totals

**Invariant:** Raw parser rows are never summed as final totals unless the parser contract proves they are additive for that source, tab, and scope.

Banned shortcuts:

- summing raw fee-sheet rows in chat,
- treating summary rows as detail rows,
- treating detail rows as summary rows,
- using parser debug output as dashboard truth.

Required evidence:

- parser row type,
- additive/not-additive flag,
- source tab,
- source row identity.

Required tests:

- CLIENT SUMMARY totals row fixture,
- V-tab detail fixture,
- duplicated role section fixture,
- raw parser rows cannot be passed to reporter as totals without additive proof.

Regression examples:

- chat doubles fee-sheet totals,
- Sheet Health flags formula errors from the wrong part of the sheet.

## Law 7: Raw, Cache, And Visible Must Reconcile Or Warn

**Invariant:** Derived caches are acceleration only. Raw source facts remain inspectable, and raw/cache/visible disagreements are classified.

Float classification:

- raw > 0 and cache = 0 is `FAIL`,
- visible > 0 and cache = 0 is `FAIL`,
- cache > 0 and raw = 0 is `WARN`,
- raw/cache non-trivial delta is at least `WARN`,
- inactive Float contributing visible dashboard hours is `FAIL`,
- cache-only data must explain why raw source cannot currently prove it.

Banned shortcuts:

- green status when raw/cache disagree,
- hiding stale cache rows,
- deleting cache warnings because the UI looks right,
- comparing raw task spans to monthly semantic hours without a label.

Required evidence:

- raw Float task rows,
- expanded allocation rows,
- cache rows,
- visible dashboard row,
- expansion rule,
- active/archive state.

Required tests:

- BT raw-without-cache,
- PCS00250 cache-without-raw,
- raw/cache delta,
- inactive visible hours,
- multi-person Float task split.

Regression examples:

- PCS00250 shows cache hours but raw Float canon has no task rows and the app marks it pass,
- UCS04787 dashboard total cannot explain the difference to Float UI/export.

## Law 8: Archive State Is A Warning, Not A Hide Rule

**Invariant:** Real revenue or hours remain visible even when attached to archived projects or inactive Float jobs.

Client language:

- Archive is a dashboard overlay, not a source edit.

Banned shortcuts:

- `excludeArchived` removing real production revenue,
- hiding archived Float jobs with hours,
- treating manual archive as proof that duplicate evidence is irrelevant,
- counting archived data in hero while hiding it in Projects.

Required evidence:

- source row,
- archive state,
- displayed row,
- archive warning.

Required tests:

- archived prod-rev visible in Projects/CSV,
- archived Float project with hours visible in Float diagnostics,
- archived duplicate remains visible as mismatch evidence.

Regression examples:

- Sian sees hero sold including archived production revenue but Projects total excludes it.

## Law 9: Chat Is Read-Only Evidence Reporting

**Invariant:** Chat can investigate and explain, but it cannot invent, mutate, sync, archive, deploy, or claim unsupported certainty.

Banned shortcuts:

- answering from model memory alone,
- hiding tool errors,
- claiming "zero hours" when nonzero source facts exist,
- claiming "dashboard bug" without a failed check,
- claiming Float mismatch without comparing the necessary layers or marking unresolved.

Required evidence:

- `EvidencePack`,
- sources checked,
- warnings,
- confidence,
- unresolved conflicts,
- `Needs Codex` handoff when repo/browser/mutation/deploy work is required.

Required tests:

- bad pasted transcript regression,
- USA sold-hours false-zero guard,
- PCS stale-cache warning,
- tool-error evidence,
- final answer after required serial tools.

Regression examples:

- chat says USA projects have zero sold hours when fee sheets contain hours,
- chat describes unmapped role data as formula errors without checking source cells.

## Law 10: Approval Requires Source, Contract, UI, Export, And Chat Agreement

**Invariant:** No feature is approved until the law is proven at every relevant layer.

Banned shortcuts:

- unit-only approval,
- screenshot-only approval,
- live-only approval,
- fixture-only approval,
- build success treated as data correctness,
- deploy success treated as dashboard correctness.

Required evidence:

- unit tests,
- contract tests,
- real-data verify,
- deterministic UI tests,
- CSV parity,
- chat/evidence check when chat can answer that question.

Required tests:

- `npm test`,
- `npm run verify`,
- scoped verify commands,
- `npm run sian:check`,
- deterministic Playwright,
- `npm run build`.

Regression examples:

- search box visually exists but only reorders rows,
- archive button works for one user but click path is untested.
