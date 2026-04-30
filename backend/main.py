from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import jogadores, peladas, stats

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pelada Manager", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jogadores.router)
app.include_router(peladas.router)
app.include_router(stats.router)

@app.get("/")
def root():
    return {"status": "ok", "projeto": "Pelada Manager"}
