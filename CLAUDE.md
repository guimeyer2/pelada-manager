# Pelada Manager — Project Context

## What it is
Web app to organize a weekly football (futsal) game. The organizer manages the player list, draws balanced teams, tracks payments, and keeps a history of all matches.

## Business rules (immutable)
- **12 confirmed** → format 6x6, duration 1h30, fee per player: **R$ 28.75**
- **15 confirmed** → format 5v5v5, duration 2h, fee per player: **R$ 30.70**
- Match happens every **Thursday**
- List opens every **Monday** in the WhatsApp group
- Teams are drawn by **balancing average ratings** (rating 1–10)
- Payment is via **PIX**, toggled manually per player (paid / pending)

## Features
- Player roster with rating and **alias system** (e.g. "brenoca" → resolves to "Breno")
- Weekly match creation
- List import: paste WhatsApp list → strips emojis, numbered lines only, resolves aliases → fuzzy match → creates new player if unknown
- Auto-detection of format (12 or 15 players)
- **Randomized** balanced team draw (snake draft, shuffled within equal-rating groups); reshuffle on demand
- Team names: **Preto** / **Branco** / **Colorido** (Black / White / Colorful in EN)
- Per-player payment toggle (Paid / Pending)
- Payment reminder message for WhatsApp
- **Scoreboard** for 2-team matches (Preto × Branco)
- **Organizer goals** counter per match (Meyer's goals only — stored on the Match record)
- Reopen closed matches
- Stats dashboard: total matches, collected amount, 2-team/3-team breakdown, **my total goals**, **my goals in 2-team matches**
- **EN / PT language toggle** — persisted in localStorage; default English

## Out of scope (do not implement)
- Automatic PIX receipt reading
- WhatsApp API integration
- Assists per player
- Auth / multi-user

## Stack
- **Backend:** Python 3.12+, FastAPI, SQLAlchemy, SQLite, Pydantic v2
- **Frontend:** React 18, Vite, Tailwind CSS v3, React Router v6, Axios
- **Monorepo:** /backend and /frontend at root

## Database
- SQLite file at `backend/pelada.db` (local, not committed)
- Schema auto-created on startup via `Base.metadata.create_all`
- **Column migrations** run automatically on startup (idempotent `ALTER TABLE` statements in `main.py`) — safe to add new columns without manual migration

## Conventions
- Everything in English: variables, functions, files, routes, comments
- Pydantic schemas: `Create` (input), `Read` (output), `Update` (PATCH)
- Services have no FastAPI dependency (pure logic)
- Router files: `players.py`, `matches.py`, `stats.py`
- Service files: `draw.py`, `formatter.py`

## Frontend design system
- Follows Emil Kowalski's design engineering principles (`.agents/skills/emil-design-eng/`)
- Buttons: `active:scale-[0.97]` + `transition-[transform,background-color] duration-150`
- Cards: `rounded-xl`, subtle `hover:-translate-y-px`
- Transitions always specify exact properties (never `transition: all`)
- Badges: pill shape with `ring-1` + opacity tint
- Spinner shared component at `src/components/Spinner.jsx`
- i18n via `src/i18n/LangContext.jsx` + `src/i18n/translations.js`

## Key data model notes
- `Player.aliases` — JSON array stored as Text; resolved before fuzzy match in `add_players`
- `Match.organizer_goals` — integer, Meyer's goals for that match
- `Match.score_a / score_b` — final score for 2-team matches (Team Preto / Branco)
- Team labels A/B/C are internal; display names come from i18n (`teams.black`, `teams.white`, `teams.colorful`)
