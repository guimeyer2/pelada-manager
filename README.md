# Pelada Manager

Web app to organize a weekly football game — player roster, balanced team draw, payments, and match history.

## Features

- **Players** — register with rating (1–10) and aliases (e.g. "jzinho" → resolves to "João")
- **Match creation** — paste the WhatsApp list; emojis and numbering are stripped automatically
- **Team draw** — randomized snake draft balancing average ratings; reshuffle on demand
- **Team names** — Preto / Branco for 2-team matches, + Colorido for 3-team
- **Scoreboard** — track the final score (Preto × Branco) per match
- **My goals** — organizer's personal goal counter per match, tracked in stats
- **Payments** — toggle paid/pending per player; generate WhatsApp payment reminder
- **Stats** — matches played, total collected, my goals (all / 2-team), per-player attendance table
- **EN / PT toggle** — switch UI language on the fly

## Running locally

### Backend

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn main:app --reload
```

API → `http://localhost:8000`  
Docs → `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App → `http://localhost:5173`

## Database

SQLite file at `backend/pelada.db` (auto-created on first run, not committed to git).  
Schema migrations run automatically on startup — no manual steps needed when pulling new columns.

## Deploy notes

SQLite works fine for a single-user deploy (VPS, Railway, Render with a persistent volume).  
To use PostgreSQL instead, set the `DATABASE_URL` environment variable — the code adapts automatically.
