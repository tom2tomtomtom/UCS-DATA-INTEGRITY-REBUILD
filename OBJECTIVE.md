# Ultimate Objective

## Who is this for?

Three people at Uncommon Creative Studio, each with a different stake in the same numbers:

- **Sian Welsh**: commercial lead. Owns the SOLD vs ALLOCATED conversation. Is the primary voice on every call.
- **Jade Barrett**: runs the Pipeline sheet. Cares that her pipeline rows surface correctly and tie back to what eventually gets sold.
- **Yunni**: owns Float, the resourcing system, and the technical setup behind it. Cares that what is allocated in Float matches what was sold, and that orphan allocations get spotted, not hidden.

Sian is the one whose trust the dashboard has to earn. Jade and Yunni are the ones whose data integrity it depends on.

## What do they need to do?

Spot mistakes across the four truth streams: Sold, Pipeline, Production Revenue, and Float allocations, before those mistakes turn into lost money, missed billing, or wrong staffing. Specifically: see where SOLD and ALLOCATED disagree, see Float allocations with no matching sold job and vice versa, see which jobs exist in one sheet but not another, and see it all in one place without re-opening the spreadsheets or the Float UI.

The deeper problem behind all of this is human. Data entry across the four sources is inconsistent: jobs opened without being costed properly, Float allocations made against the wrong project, pipeline rows that never get archived, fee sheets that disagree with production revenue. The dashboard's real job is to expose every one of those human errors in one place so the team can fix them at source, week by week, until the four sheets agree, or mostly agree with a small known delta. It is a forcing function for cleaning up the data entry process, not a band-aid over it.

## What does success look like to them?

Three phases, same dashboard:

1. **Today**: Sian, Jade, and Yunni use the dashboard to find every disagreement between the four sheets. Errors are loud and obvious. The weekly conversation is "this row is wrong, who fixes it?" instead of "is this number even right?".
2. **In a few months**: most errors have been fixed at source. The four sheets agree, or disagree by a small known delta. Only small fixes are needed each week. Sian opens the dashboard, reads the headline, and trusts it without cross-checking against the sheets.
3. **After that**: because the historic data is now clean, the dashboard earns the right to do intelligent things on top of it: trend lines, forecasting, anomaly detection, decision support. None of which is possible until the data underneath is trustworthy.

Success today is making the mess visible. Success tomorrow is making decisions on data that no longer lies.

## What does failure look like to them?

Sian still has to open the source sheets to verify what the dashboard just told her. Jade's pipeline row exists in her sheet but the dashboard has silently dropped it. Yunni's Float allocation has no matching sold job and the dashboard hides it instead of flagging it. Numbers in the UI do not tie back to the four sources. They have to ask Tom or Claude to explain why a total moved, instead of seeing it for themselves.

## What this app is NOT for

- Not a job tracking system. The sheets are the system of record. This dashboard never edits them.
- Not a forecasting tool. It reports what is in the sheets today, not what might happen next quarter.
- Not a CRM or client database.
- Not a reconciliation engine that auto-corrects mismatches. Mismatches are the product, not a bug to hide.
- Not a replacement for the four source sheets. If the dashboard and the sheets disagree, the sheets win and the dashboard is wrong.
- Not a redesign of the UX Sian already signed off on. The legacy front end stays; only the data layer underneath it is new.
