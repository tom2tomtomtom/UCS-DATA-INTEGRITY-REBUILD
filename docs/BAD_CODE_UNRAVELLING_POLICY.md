# Bad Code Unravelling Policy

## Purpose

The old dashboard became hard to trust because bad data paths were repeatedly patched instead of removed.

This policy defines when to stop doing code archaeology and start unravelling the bad path.

## Principle

Code archaeology is for diagnosis only.

Once a code path is proven to create bad data, it must lose authority.

Do not preserve a bad path because it is old, complex, useful in one view, or expensive to understand.

## When To Unravel

Unravel a code path when it:

- produces a visible number outside the display contract,
- hides source rows,
- treats unsupported as zero,
- joins Float by inferred identity when explicit identity exists,
- mixes raw/parser/cache/display layers,
- uses old selectors as product truth,
- makes CSV differ from visible rows,
- makes chat answer from a private path,
- silently reconciles source conflicts,
- requires repeated patches for adjacent failures.

## Unravelling Workflow

1. Capture the bad visible output.
2. Name the violated law.
3. Trace backwards only far enough to identify the bad authority path.
4. Write or update the regression test.
5. Quarantine or delete the bad path.
6. Rebuild the path through the lawful layer.
7. Prove UI, CSV, chat, and verify use the lawful path.
8. Document the removed authority in the legacy decommission notes.

## What Not To Do

- Do not add another conditional around the bad path.
- Do not widen tolerance to make it pass.
- Do not add another selector beside it.
- Do not leave it callable from a product surface.
- Do not call a diagnostic workaround the fix.
- Do not let a script keep using the old path because "only developers use it".

## Quarantine

If a path cannot be deleted immediately:

- move it under a clearly named legacy or diagnostic boundary,
- block product imports,
- mark outputs as diagnostic only,
- add a test that product surfaces cannot import it,
- create a deletion task.

## Code Archaeology Limit

If more than one hour is spent trying to understand a bad path without reaching a law-backed fix, stop and write:

```txt
Bad output:
Violated law:
Suspected old path:
Why archaeology is stuck:
Proposed lawful replacement:
```

Then build the lawful replacement behind tests.

## Required Tests

- no product route imports quarantined legacy selectors,
- no CSV export imports old row builders,
- no chat tool imports old selector paths,
- no verify script uses old display logic,
- bad path regression remains covered after deletion.

## Product Standard

The rebuild should prefer deleting a bad authority path over understanding every historical reason it existed.

The goal is not to honour old complexity. The goal is to make bad data impossible to publish.
