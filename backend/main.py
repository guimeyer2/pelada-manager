from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from database import engine, Base
from routers import players, matches, stats

Base.metadata.create_all(bind=engine)

# Add aliases column to existing DBs that predate this field
_migrations = [
    "ALTER TABLE players ADD COLUMN aliases TEXT DEFAULT '[]'",
    "ALTER TABLE matches ADD COLUMN organizer_goals INTEGER DEFAULT 0",
    "ALTER TABLE matches ADD COLUMN score_a INTEGER",
    "ALTER TABLE matches ADD COLUMN score_b INTEGER",
]
with engine.connect() as _conn:
    for _sql in _migrations:
        try:
            _conn.execute(text(_sql))
            _conn.commit()
        except Exception:
            pass

app = FastAPI(title="Pelada Manager", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router)
app.include_router(matches.router)
app.include_router(stats.router)


@app.get("/")
def root():
    return {"status": "ok", "project": "Pelada Manager"}
