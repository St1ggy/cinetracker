# Feature Goal: Personalized Recommendations

## Problem

Users can track and organize media, but discovery still depends mostly on manual browsing and static filters.

## Goal

Provide personalized recommendations based on a user’s watch history, ratings, and genre/type preferences.

## User Value

- Less decision fatigue.
- Higher relevance than generic discovery.
- Better use of accumulated tracking data.

## Core Scope (MVP)

- Generate recommendation candidates from:
  - watched history,
  - explicit ratings,
  - preferred genres and media types.
- Show recommendation blocks with reason tags (for transparency).
- Add feedback actions:
  - save for later,
  - not interested.
- Refresh recommendations on meaningful profile updates.

## Product Rules

- Recommendations should avoid already watched/completed media.
- Explainability is required (why this item appeared).
- Cold-start fallback should work for new users.
- Feedback must influence future suggestions.

## Out of Scope (Initial Version)

- Deep neural ranking pipelines.
- Cross-user collaborative filtering at scale.

## Success Metrics

- CTR on recommendation cards.
- Save/add rate from recommendations.
- Improvement in session-to-watch conversion.
