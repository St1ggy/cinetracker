# CineTracker

A personal media tracker for movies, TV shows and anime — with public lists, community ratings, and a tag-based catalog.

**Live:** https://cinetracker-pied.vercel.app · **Repo:** https://github.com/St1ggy/cinetracker

---

## Features

- **Home feed** — your personal watch list with filters (genre, status, sort) and three view modes (grid / compact / list)
- **Lists** — create multiple named lists with custom visibility (private / unlisted / public)
- **Public catalog** (`/explore`) — browse community lists, search by title, filter by tags, sort by newest / most popular / top rated
- **List ratings** — rate public lists 1–5 stars (username required)
- **Anonymous publishing** — publish a list publicly without revealing your identity
- **User profiles** (`/u/[handle]`) — public page showing all non-anonymous public lists of a user
- **Multi-source enrichment** — media metadata fetched and merged from TMDB, AniList, OMDB, TVDB, Jikan, Kitsu and Trakt
- **Username system** — set a handle (changeable once per 30 days) required for public actions
- **i18n** — English, Russian, French, Japanese and Chinese
- **Theme** — light / dark / system
- **Toast notifications** — all actions surface success / error feedback

## Tech stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 (Runes) |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL via Prisma ORM |
| Auth | Auth.js (sveltekit adapter) |
| Server state | TanStack Query |
| i18n | Paraglide JS |
| Storage | unstorage (localStorage + SSR memory) |
| Deployment | Vercel |
| Versioning | semantic-release (conventional commits) |

## Getting started

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the required variables:

```
DATABASE_URL=postgresql://...
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

```bash
# Apply DB migrations
npx prisma migrate deploy

# Start dev server
npm run dev
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run check` | Svelte type-check |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run prisma:migrate:dev` | Create & apply a new migration |

## Versioning

Releases are handled automatically by **semantic-release** on every push to `main`:

| Commit prefix | Version bump |
|---|---|
| `feat:` | minor |
| `fix:`, `perf:`, `refactor:` | patch |
| `BREAKING CHANGE` | major |
| `chore:`, `docs:`, `style:` | — |

The version from `package.json` is injected at build time via `vite.config.ts` (`__APP_VERSION__`) and displayed in the sidebar.
