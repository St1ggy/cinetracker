# Feature Goal: Monthly Goals and Streak

## Problem

Users can track media, but there is no long-term motivation loop. After creating lists, engagement depends on manual discipline.

## Goal

Add a goals system that helps users commit to a monthly watching target and keep a streak.

## User Value

- Turns passive tracking into an active challenge.
- Gives users clear progress feedback.
- Increases return frequency through streak preservation.

## Core Scope (MVP)

- Set monthly target:
  - number of movies watched, or
  - number of episodes watched.
- Show monthly progress on profile and home.
- Show streak metrics:
  - current streak (days/weeks with activity),
  - best streak.
- Celebrate milestone completion with lightweight UI feedback.

## Product Rules

- Progress counts only when `WatchStatus` changes to `WATCHED`.
- Episodic media contributes by episode completion, not by opening a card.
- Goal window is calendar month in user locale/timezone.
- If no goal is set, show onboarding prompt instead of empty numbers.

## Out of Scope (Initial Version)

- Social leaderboards.
- Cross-user competitions.
- Rewards economy / gamification store.

## Success Metrics

- Goal setup rate among active users.
- Monthly goal completion rate.
- Retention delta for users with at least one active goal.
- Average session frequency for streak users.
