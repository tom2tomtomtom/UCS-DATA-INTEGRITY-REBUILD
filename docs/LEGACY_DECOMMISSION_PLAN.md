# Legacy Decommission Plan

## Purpose

The rebuild fails if old authority paths sneak back in.

This plan defines how the old app is used for reference, then retired as an authority.

## Allowed Uses Of Old App

Allowed:

- UX screenshots,
- route inventory,
- client workflow understanding,
- regression scenario discovery,
- source of known bugs,
- comparison during dual run.

Not allowed:

- copying selectors as new authority,
- copying CSV builders without contract rewrite,
- copying chat tools without evidence boundary,
- copying sync filters without source-row preservation review,
- using old output as truth when it disagrees with source laws.

## Legacy Import Checklist

Before any old code is copied:

```txt
Old file/function:
Purpose:
Known failure risk:
Protected law:
New test:
Does it create a second authority? yes/no
Decision:
```

If the answer to "Does it create a second authority?" is yes, do not copy it.

## Dual Run

During dual run, differences must be classified:

- old bug,
- new bug,
- source issue,
- intentional behavior change,
- unresolved.

Rules:

- old app is comparison evidence,
- source laws decide approval,
- unexplained differences block cutover.

## Cutover

Before cutover:

- new app passes all gates,
- old differences are classified,
- old app is marked read-only/reference,
- stakeholders know which URL is authoritative,
- old scheduled jobs are disabled or documented,
- old docs point to new repo.

## Required Tests

- no UI route imports legacy selectors,
- no verify script calls old display paths,
- no chat tool calls old selectors,
- no CSV path bypasses new display contract.
