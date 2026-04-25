# Feature Goal: Import / Export Interoperability

## Problem

New users often already maintain media history in other services. Manual migration is slow and blocks onboarding.

## Goal

Enable import/export workflows so users can move their data in and out of CineTracker with minimal friction.

## User Value

- Faster onboarding for users coming from other trackers.
- Lower lock-in anxiety.
- Better trust in long-term data ownership.

## Core Scope (MVP)

- Import from CSV and one external provider format first.
- Export user library to CSV.
- Field mapping preview before final import.
- Import report:
  - created entries,
  - updated entries,
  - skipped rows with reasons.

## Product Rules

- Imports are idempotent where possible (same record should not duplicate each run).
- Validation errors are recoverable and visible per row.
- User confirms merge strategy before apply.
- Large imports are chunked and resilient to partial failures.

## Out of Scope (Initial Version)

- Real-time sync with external providers.
- Bi-directional continuous reconciliation.

## Success Metrics

- Time-to-first-complete-library after signup.
- Import success rate.
- Reduction in abandonment during onboarding.
