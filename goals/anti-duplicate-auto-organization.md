# Feature Goal: Anti-Duplicate and Auto-Organization

## Problem

The same media can end up in multiple lists unintentionally. This creates noise and forces manual cleanup.

## Goal

Prevent accidental duplicates and provide one-click organization actions when duplicates are detected.

## User Value

- Cleaner personal library.
- Less friction when adding media.
- Faster maintenance of multiple themed lists.

## Core Scope (MVP)

- On add-to-list action, detect if media already exists in another user list.
- Show conflict hint with context: list name and current status.
- Offer quick actions:
  - keep in both lists,
  - move to current list,
  - cancel add.
- Add optional duplicate badge/filter in list management screens.

## Product Rules

- Duplicate detection is user-scoped only (never across users).
- Existing intentional duplicates must remain allowed.
- Quick move preserves item metadata (rating, notes, progress) where possible.
- Conflict prompts should not block power users (single confirm interaction max).

## Out of Scope (Initial Version)

- Automatic background deduplication without user confirmation.
- Bulk merge wizard for all lists.

## Success Metrics

- Duplicate incidence rate per active user.
- Completion rate of quick actions.
- Reduction in manual delete/move operations after rollout.
