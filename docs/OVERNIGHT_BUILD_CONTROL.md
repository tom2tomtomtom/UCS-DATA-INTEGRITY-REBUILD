# Overnight Build Control

## Purpose

This document keeps the overnight rebuild from turning into another whackamole run.

The controller is allowed to build, test, commit, push, and spawn bounded agents. The controller is not allowed to skip gates, invent source behaviour, or move into product UI before the display contract exists.

## Operating Model

There are three layers of control:

1. GitHub issues are the public ticket board.
2. This repo contains the immutable laws, phase gates, and execution notes.
3. The controller thread owns integration, commits, pushes, and stop decisions.

Agents are helpers, not owners of truth.

## Doctrine Steward

One read-only Doctrine Steward agent should stay outside implementation work.

The Doctrine Steward checks whether planned work and completed work obey:

- immutable laws,
- source contracts,
- acceptance gates,
- phase order,
- mutation boundaries,
- unsupported-not-zero rules,
- one display contract ownership.

The Doctrine Steward may report `PASS`, `DATA_WARN`, `PROCESS_WARN`, or `FAIL`.

Use `DATA_WARN` only for real source limitations, source mismatches, or source conflicts that the product must surface honestly.

Use `PROCESS_WARN` for build governance risk, partial implementation, missing future scripts, incomplete screenshots, or incomplete tickets.

Never use a warning to bless hidden assumptions.

The Doctrine Steward must not:

- edit files,
- merge work,
- deploy,
- run migrations,
- mutate source systems,
- become the source of product requirements.

The controller remains responsible for final decisions, commits, pushes, and stopping the build.

Required Doctrine Steward checkpoints:

- before accepting any agent output,
- before each commit that includes code,
- before each push that advances a phase,
- before each phase transition,
- after each failed test or failed gate that is not immediately fixed.

Each Doctrine Steward review must leave an artifact in the active GitHub issue, `docs/BUILD_LOG.md`, or both.

## Ticket Rules

Every phase must have a GitHub issue before implementation starts.

Every ticket must include:

- scope,
- deliverables,
- exit criteria,
- tests or verification command,
- forbidden shortcuts,
- stop conditions.

No work is considered complete because code exists. It is complete only when the ticket's verification passes or the ticket is explicitly marked blocked with evidence.

Detailed implementation tickets are required before each phase begins.

Phase tickets define direction. Implementation tickets define ownership, write sets, verification, and agent boundaries. If a later phase only has a phase ticket, that phase is not yet ready for implementation agents.

## Agent Rules

Agents may be spawned only for bounded tasks with a clear write set or read-only research scope.

Each agent prompt must include:

- repo path,
- ticket or phase,
- files or modules owned,
- exact deliverables,
- exact verification commands,
- instruction not to deploy, SSH, mutate production data, or revert other work,
- instruction to report changed files and blocker evidence.

Every implementation agent must read:

- `AGENTS.md`,
- `docs/IMMUTABLE_LAWS.md`,
- `docs/DEVELOPMENT_DOCTRINE.md`,
- the active phase ticket,
- the active implementation ticket,
- any source, identity, warning, environment, or UX policy relevant to its write set.

The controller may add more docs. The controller must not give an implementation agent less doctrine than its task can touch.

Agents must not:

- modify source systems,
- run deployments,
- apply migrations to remote Supabase unless explicitly instructed by the controller after a gate passes,
- query legacy DB as product truth,
- create product UI before the display contract exists,
- introduce second display logic outside the contract,
- make unsupported source fields look like zero.

## Agent Final Report Schema

Every implementation agent must finish with:

- status: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, or `BLOCKED`,
- ticket,
- declared write set,
- files changed,
- commands run,
- command results,
- laws protected,
- claims made,
- verification evidence,
- blockers,
- residual risks,
- whether any work touched files outside the declared write set.

Reports missing this structure are `PROCESS_WARN` at minimum.

## Scope Compliance Check

Before accepting any agent output, the controller must compare:

- declared write set,
- actual `git diff --name-only`,
- ticket deliverables,
- tests added or updated,
- docs touched.

If actual changes exceed ownership, the controller must inspect and either reject, split, or explicitly record why the change is lawful.

## Controller Duties

The controller must:

- keep `main` clean and pushed after each completed increment,
- run verification before each commit,
- inspect agent outputs before merging or accepting them,
- stop on failed gates that cannot be resolved safely,
- leave a build log of decisions, blockers, and commands.

## Context Checkpoint Protocol

The build must be able to survive chat compaction or agent failure.

The controller cannot force the chat runtime to compact at an exact percentage. Instead, the controller must externalise state before context becomes risky.

Checkpoint after:

- every completed ticket,
- every agent final report,
- every failed gate,
- every architectural decision,
- every push,
- any long-running investigation that changes the next action.

Each checkpoint must update one or more durable surfaces:

- GitHub issue comment,
- commit message,
- `docs/BUILD_LOG.md`,
- ADR, if the decision changes architecture.

A checkpoint must include:

- current ticket,
- current phase,
- active GitHub issue number,
- files changed,
- commands run,
- tests passed or failed,
- open blockers,
- next action,
- whether the Doctrine Steward saw a `PASS`, `DATA_WARN`, `PROCESS_WARN`, or `FAIL`.

If context compaction happens, the resumed controller must read:

1. `docs/OVERNIGHT_BUILD_CONTROL.md`,
2. `docs/BUILD_LOG.md`,
3. the active GitHub issue,
4. `git status --short --branch`.

The resumed controller must not rely on remembered chat context for build truth.

## Stop Rules

Stop and report instead of pushing forward if:

- a test proves a law conflict,
- a required source contract is missing,
- a migration would touch the wrong Supabase project,
- the only way forward is to copy old selector logic as truth,
- an agent changes files outside its ownership,
- live data access requires mutating source systems,
- secrets would need to be committed or printed.

## Placeholder Graduation

Pending tests and placeholder verification scripts are allowed only while the phase they verify has not started.

The moment a phase begins implementing behaviour covered by a placeholder, the placeholder must become one of:

- an active passing test,
- an active failing test that drives implementation,
- an explicit blocker in the GitHub issue.

Placeholders cannot remain non-blocking after their behaviour ships.

## Overnight Success Definition

An overnight run is successful if it produces a smaller, more lawful system than it started with.

Success does not require finishing every phase. It requires:

- no hidden data assumptions,
- no skipped gates,
- pushed commits after verified increments,
- clear blockers where the system cannot yet proceed,
- tickets updated with real status.
