#!/bin/bash
set -e

echo "Criando estrutura do pelada-manager..."

# --- Pastas ---
mkdir -p backend/routers backend/services
mkdir -p frontend/src/api frontend/src/pages frontend/src/components

# --- .gitignore ---
cat > .gitignore << 'EOF'
__pycache__/
*.py[cod]
venv/
.venv/
.env
*.db
node_modules/
dist/
.env.local
.DS_Store
EOF

# --- CLAUDE.md ---
cat > CLAUDE.md << 'EOF'
# Pelada Manager — Contexto do Projeto

## O que é
Aplicação web para organizar uma pelada semanal de futebol. O organizador gerencia a lista de jogadores, sorteia times equilibrados, controla pagamentos e mantém histórico de todas as peladas.

## Regras de negócio (imutáveis)
- **12 confirmados** → formato 6x6, duração 1h30, valor por jogador: **R$ 28,75**
- **15 confirmados** → formato 5v5v5, duração 2h, valor por jogador: **R$ 30,70**
- A pelada ocorre toda **quinta-feira**
- A lista é aberta toda **segunda-feira** no grupo do WhatsApp
- Times são sorteados **equilibrando a média de ratings** dos jogadores (rating de 1 a 10)
- Pagamento é via **PIX**, controlado manualmente (toggle pago/não pago por jogador)

## Features
- Cadastro de jogadores com rating
- Criação de pelada semanal
- Importação de lista (cola nomes, resolve para cadastrados ou cria novo)
- Detecção automática de formato (12 ou 15 jogadores)
- Sorteio de times balanceados por média
- Controle de pagamento por jogador
- Geração de mensagem de cobrança para WhatsApp
- Registro de gols por pelada
- Dashboard de histórico e estatísticas

## Fora do escopo (não implementar)
- Leitura automática de comprovante PIX
- Integração com WhatsApp API
- Assistências por jogador
- Autenticação/multi-usuário

## Stack
- **Backend:** Python 3.12+, FastAPI, SQLAlchemy, SQLite, Pydantic v2
- **Frontend:** React 18, Vite, Tailwind CSS v3, React Router v6, Axios
- **Monorepo:** /backend e /frontend na raiz

## Convenções
- Variáveis e funções em português
- Arquivos e rotas em inglês/técnico
- Schemas Pydantic: sufixo Create (input), Read (output), Update (PATCH)
- Services sem dependência do FastAPI (lógica pura)
EOF

# --- README.md ---
cat > README.md << 'EOF'
# Pelada Manager

Aplicação web para organizar peladas semanais — lista, times equilibrados, pagamentos e histórico.

## Rodando localmente

### Backend
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
uvicorn main:app --reload
```
API em `http://localhost:8000` · Docs em `http://localhost:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App em `http://localhost:5173`
EOF

# ==================== BACKEND ====================

cat > backend/requirements.txt << 'EOF'
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy==2.0.35
pydantic==2.9.2
python-dotenv==1.0.1
EOF

cat > backend/database.py << 'EOF'
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pelada.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
EOF

cat > backend/models.py << 'EOF'
from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class FormatoPelada(str, enum.Enum):
    seis_por_seis = "6x6"
    cinco_por_cinco_por_cinco = "5v5v5"

class StatusPelada(str, enum.Enum):
    aberta = "aberta"
    encerrada = "encerrada"

class Time(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"

class Jogador(Base):
    __tablename__ = "jogadores"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    rating = Column(Float, default=5.0)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    participacoes = relationship("PeladaJogador", back_populates="jogador")

class Pelada(Base):
    __tablename__ = "peladas"
    id = Column(Integer, primary_key=True, index=True)
    data = Column(Date, nullable=False)
    formato = Column(Enum(FormatoPelada), nullable=True)
    valor_por_jogador = Column(Float, nullable=True)
    status = Column(Enum(StatusPelada), default=StatusPelada.aberta)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    participacoes = relationship("PeladaJogador", back_populates="pelada")

class PeladaJogador(Base):
    __tablename__ = "pelada_jogadores"
    id = Column(Integer, primary_key=True, index=True)
    pelada_id = Column(Integer, ForeignKey("peladas.id"), nullable=False)
    jogador_id = Column(Integer, ForeignKey("jogadores.id"), nullable=False)
    time = Column(Enum(Time), nullable=True)
    pago = Column(Boolean, default=False)
    gols = Column(Integer, default=0)
    pelada = relationship("Pelada", back_populates="participacoes")
    jogador = relationship("Jogador", back_populates="participacoes")
EOF

cat > backend/schemas.py << 'EOF'
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from models import FormatoPelada, StatusPelada, Time

class JogadorCreate(BaseModel):
    nome: str
    rating: float = 5.0
    ativo: bool = True

class JogadorUpdate(BaseModel):
    nome: Optional[str] = None
    rating: Optional[float] = None
    ativo: Optional[bool] = None

class JogadorRead(BaseModel):
    id: int
    nome: str
    rating: float
    ativo: bool
    criado_em: datetime
    model_config = {"from_attributes": True}

class PeladaCreate(BaseModel):
    data: date

class PeladaRead(BaseModel):
    id: int
    data: date
    formato: Optional[FormatoPelada]
    valor_por_jogador: Optional[float]
    status: StatusPelada
    criado_em: datetime
    total_jogadores: Optional[int] = 0
    total_pagos: Optional[int] = 0
    model_config = {"from_attributes": True}

class AdicionarJogadoresInput(BaseModel):
    nomes: list[str]

class PeladaJogadorRead(BaseModel):
    id: int
    jogador_id: int
    nome: str
    rating: float
    time: Optional[Time]
    pago: bool
    gols: int
    model_config = {"from_attributes": True}

class PagamentoUpdate(BaseModel):
    pago: bool

class GolsUpdate(BaseModel):
    gols: int

class SorteioResult(BaseModel):
    times: dict[str, list[PeladaJogadorRead]]
    media_por_time: dict[str, float]

class JogadorStats(BaseModel):
    jogador_id: int
    nome: str
    rating: float
    total_peladas: int
    percentual_presenca: float
    total_gols: int
    total_pago: float
    vitorias: int
    derrotas: int
    empates: int

class DashboardStats(BaseModel):
    total_peladas: int
    total_arrecadado: float
    artilheiro: Optional[str]
    jogador_mais_presente: Optional[str]
    peladas_6x6: int
    peladas_5v5v5: int
EOF

cat > backend/services/__init__.py << 'EOF'
EOF

cat > backend/services/sorteio.py << 'EOF'
from typing import NamedTuple

class JogadorParaSorteio(NamedTuple):
    id: int
    nome: str
    rating: float

def sortear_times(jogadores, num_times):
    if num_times not in (2, 3):
        raise ValueError("num_times deve ser 2 ou 3")
    labels = ["A", "B", "C"][:num_times]
    times = {label: [] for label in labels}
    ordenados = sorted(jogadores, key=lambda j: j.rating, reverse=True)
    for i, jogador in enumerate(ordenados):
        ciclo = i // num_times
        posicao = i % num_times
        idx = posicao if ciclo % 2 == 0 else (num_times - 1) - posicao
        times[labels[idx]].append(jogador)
    medias = {
        label: round(sum(j.rating for j in lista) / len(lista), 2) if lista else 0.0
        for label, lista in times.items()
    }
    return times, medias

def determinar_formato(total_jogadores):
    if total_jogadores == 12:
        return "6x6", 28.75
    if total_jogadores == 15:
        return "5v5v5", 30.70
    return None, None
EOF

cat > backend/services/formatador.py << 'EOF'
def mensagem_cobranca(data_pelada, pendentes, valor, chave_pix=""):
    nomes = "\n".join(f"  - {nome}" for nome in pendentes)
    pix_linha = f"\nChave PIX: *{chave_pix}*" if chave_pix else ""
    return (
        f"Pelada {data_pelada.strftime('%d/%m')} — pagamento pendente:\n\n"
        f"{nomes}\n\n"
        f"Valor: *R$ {valor:.2f}*{pix_linha}"
    )
EOF

cat > backend/routers/__init__.py << 'EOF'
EOF

cat > backend/routers/jogadores.py << 'EOF'
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Jogador
from schemas import JogadorCreate, JogadorRead, JogadorUpdate

router = APIRouter(prefix="/jogadores", tags=["jogadores"])

@router.get("/", response_model=list[JogadorRead])
def listar_jogadores(apenas_ativos: bool = True, db: Session = Depends(get_db)):
    query = db.query(Jogador)
    if apenas_ativos:
        query = query.filter(Jogador.ativo == True)
    return query.order_by(Jogador.nome).all()

@router.post("/", response_model=JogadorRead, status_code=201)
def criar_jogador(data: JogadorCreate, db: Session = Depends(get_db)):
    existente = db.query(Jogador).filter(Jogador.nome == data.nome).first()
    if existente:
        raise HTTPException(status_code=400, detail="Jogador com esse nome já existe")
    jogador = Jogador(**data.model_dump())
    db.add(jogador)
    db.commit()
    db.refresh(jogador)
    return jogador

@router.patch("/{jogador_id}", response_model=JogadorRead)
def atualizar_jogador(jogador_id: int, data: JogadorUpdate, db: Session = Depends(get_db)):
    jogador = db.query(Jogador).filter(Jogador.id == jogador_id).first()
    if not jogador:
        raise HTTPException(status_code=404, detail="Jogador não encontrado")
    for campo, valor in data.model_dump(exclude_none=True).items():
        setattr(jogador, campo, valor)
    db.commit()
    db.refresh(jogador)
    return jogador

@router.delete("/{jogador_id}", status_code=204)
def desativar_jogador(jogador_id: int, db: Session = Depends(get_db)):
    jogador = db.query(Jogador).filter(Jogador.id == jogador_id).first()
    if not jogador:
        raise HTTPException(status_code=404, detail="Jogador não encontrado")
    jogador.ativo = False
    db.commit()
EOF

cat > backend/routers/peladas.py << 'EOF'
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Pelada, PeladaJogador, Jogador, FormatoPelada, Time
from schemas import (
    PeladaCreate, PeladaRead, PeladaJogadorRead,
    AdicionarJogadoresInput, PagamentoUpdate, GolsUpdate, SorteioResult
)
from services.sorteio import JogadorParaSorteio, sortear_times, determinar_formato
from services.formatador import mensagem_cobranca
from difflib import get_close_matches

router = APIRouter(prefix="/peladas", tags=["peladas"])

def _pelada_read(pelada):
    total = len(pelada.participacoes)
    pagos = sum(1 for p in pelada.participacoes if p.pago)
    return PeladaRead(
        id=pelada.id, data=pelada.data, formato=pelada.formato,
        valor_por_jogador=pelada.valor_por_jogador, status=pelada.status,
        criado_em=pelada.criado_em, total_jogadores=total, total_pagos=pagos,
    )

@router.get("/", response_model=list[PeladaRead])
def listar_peladas(db: Session = Depends(get_db)):
    peladas = db.query(Pelada).options(joinedload(Pelada.participacoes)).order_by(Pelada.data.desc()).all()
    return [_pelada_read(p) for p in peladas]

@router.post("/", response_model=PeladaRead, status_code=201)
def criar_pelada(data: PeladaCreate, db: Session = Depends(get_db)):
    pelada = Pelada(data=data.data)
    db.add(pelada)
    db.commit()
    db.refresh(pelada)
    return _pelada_read(pelada)

@router.get("/{pelada_id}", response_model=PeladaRead)
def detalhe_pelada(pelada_id: int, db: Session = Depends(get_db)):
    pelada = db.query(Pelada).options(joinedload(Pelada.participacoes)).filter(Pelada.id == pelada_id).first()
    if not pelada:
        raise HTTPException(status_code=404, detail="Pelada não encontrada")
    return _pelada_read(pelada)

@router.post("/{pelada_id}/jogadores", response_model=list[PeladaJogadorRead])
def adicionar_jogadores(pelada_id: int, data: AdicionarJogadoresInput, db: Session = Depends(get_db)):
    pelada = db.query(Pelada).filter(Pelada.id == pelada_id).first()
    if not pelada:
        raise HTTPException(status_code=404, detail="Pelada não encontrada")
    todos = db.query(Jogador).filter(Jogador.ativo == True).all()
    nomes_cadastrados = {j.nome.lower(): j for j in todos}
    for nome_bruto in data.nomes:
        nome = nome_bruto.strip()
        if not nome:
            continue
        jogador = nomes_cadastrados.get(nome.lower())
        if not jogador:
            matches = get_close_matches(nome.lower(), nomes_cadastrados.keys(), n=1, cutoff=0.8)
            if matches:
                jogador = nomes_cadastrados[matches[0]]
        if not jogador:
            jogador = Jogador(nome=nome, rating=5.0)
            db.add(jogador)
            db.flush()
            nomes_cadastrados[nome.lower()] = jogador
        ja_existe = db.query(PeladaJogador).filter_by(pelada_id=pelada_id, jogador_id=jogador.id).first()
        if not ja_existe:
            db.add(PeladaJogador(pelada_id=pelada_id, jogador_id=jogador.id))
    db.commit()
    total = db.query(PeladaJogador).filter_by(pelada_id=pelada_id).count()
    fmt, valor = determinar_formato(total)
    if fmt:
        pelada.formato = FormatoPelada(fmt)
        pelada.valor_por_jogador = valor
        db.commit()
    participacoes = db.query(PeladaJogador).options(joinedload(PeladaJogador.jogador)).filter_by(pelada_id=pelada_id).all()
    return [PeladaJogadorRead(id=pj.id, jogador_id=pj.jogador_id, nome=pj.jogador.nome, rating=pj.jogador.rating, time=pj.time, pago=pj.pago, gols=pj.gols) for pj in participacoes]

@router.get("/{pelada_id}/jogadores", response_model=list[PeladaJogadorRead])
def listar_jogadores_pelada(pelada_id: int, db: Session = Depends(get_db)):
    participacoes = db.query(PeladaJogador).options(joinedload(PeladaJogador.jogador)).filter_by(pelada_id=pelada_id).all()
    return [PeladaJogadorRead(id=pj.id, jogador_id=pj.jogador_id, nome=pj.jogador.nome, rating=pj.jogador.rating, time=pj.time, pago=pj.pago, gols=pj.gols) for pj in participacoes]

@router.post("/{pelada_id}/sortear", response_model=SorteioResult)
def sortear(pelada_id: int, db: Session = Depends(get_db)):
    pelada = db.query(Pelada).filter(Pelada.id == pelada_id).first()
    if not pelada:
        raise HTTPException(status_code=404, detail="Pelada não encontrada")
    if not pelada.formato:
        raise HTTPException(status_code=400, detail="Formato ainda não definido")
    participacoes = db.query(PeladaJogador).options(joinedload(PeladaJogador.jogador)).filter_by(pelada_id=pelada_id).all()
    num_times = 2 if pelada.formato == FormatoPelada.seis_por_seis else 3
    jogadores_sorteio = [JogadorParaSorteio(id=pj.jogador_id, nome=pj.jogador.nome, rating=pj.jogador.rating) for pj in participacoes]
    times_result, medias = sortear_times(jogadores_sorteio, num_times)
    for label, jogadores in times_result.items():
        for j in jogadores:
            pj = next(p for p in participacoes if p.jogador_id == j.id)
            pj.time = Time(label)
    db.commit()
    times_response = {}
    for label, jogadores in times_result.items():
        times_response[label] = [
            PeladaJogadorRead(
                id=next(p.id for p in participacoes if p.jogador_id == j.id),
                jogador_id=j.id, nome=j.nome, rating=j.rating, time=Time(label),
                pago=next(p.pago for p in participacoes if p.jogador_id == j.id),
                gols=next(p.gols for p in participacoes if p.jogador_id == j.id),
            ) for j in jogadores
        ]
    return SorteioResult(times=times_response, media_por_time=medias)

@router.patch("/{pelada_id}/jogadores/{pj_id}/pagamento", response_model=PeladaJogadorRead)
def atualizar_pagamento(pelada_id: int, pj_id: int, data: PagamentoUpdate, db: Session = Depends(get_db)):
    pj = db.query(PeladaJogador).options(joinedload(PeladaJogador.jogador)).filter_by(id=pj_id, pelada_id=pelada_id).first()
    if not pj:
        raise HTTPException(status_code=404, detail="Participação não encontrada")
    pj.pago = data.pago
    db.commit()
    db.refresh(pj)
    return PeladaJogadorRead(id=pj.id, jogador_id=pj.jogador_id, nome=pj.jogador.nome, rating=pj.jogador.rating, time=pj.time, pago=pj.pago, gols=pj.gols)

@router.patch("/{pelada_id}/jogadores/{pj_id}/gols", response_model=PeladaJogadorRead)
def atualizar_gols(pelada_id: int, pj_id: int, data: GolsUpdate, db: Session = Depends(get_db)):
    pj = db.query(PeladaJogador).options(joinedload(PeladaJogador.jogador)).filter_by(id=pj_id, pelada_id=pelada_id).first()
    if not pj:
        raise HTTPException(status_code=404, detail="Participação não encontrada")
    pj.gols = data.gols
    db.commit()
    db.refresh(pj)
    return PeladaJogadorRead(id=pj.id, jogador_id=pj.jogador_id, nome=pj.jogador.nome, rating=pj.jogador.rating, time=pj.time, pago=pj.pago, gols=pj.gols)

@router.get("/{pelada_id}/mensagem-cobranca")
def gerar_mensagem_cobranca(pelada_id: int, chave_pix: str = "", db: Session = Depends(get_db)):
    pelada = db.query(Pelada).filter(Pelada.id == pelada_id).first()
    if not pelada:
        raise HTTPException(status_code=404, detail="Pelada não encontrada")
    pendentes = db.query(PeladaJogador).options(joinedload(PeladaJogador.jogador)).filter_by(pelada_id=pelada_id, pago=False).all()
    nomes = [pj.jogador.nome for pj in pendentes]
    return {"mensagem": mensagem_cobranca(pelada.data, nomes, pelada.valor_por_jogador or 0, chave_pix)}
EOF

cat > backend/routers/stats.py << 'EOF'
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Pelada, PeladaJogador, Jogador, StatusPelada, FormatoPelada
from schemas import JogadorStats, DashboardStats

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db)):
    total_peladas = db.query(Pelada).filter(Pelada.status == StatusPelada.encerrada).count()
    artilheiro_row = db.query(Jogador.nome, func.sum(PeladaJogador.gols).label("total")).join(PeladaJogador, PeladaJogador.jogador_id == Jogador.id).group_by(Jogador.id).order_by(func.sum(PeladaJogador.gols).desc()).first()
    presente_row = db.query(Jogador.nome, func.count(PeladaJogador.id).label("total")).join(PeladaJogador, PeladaJogador.jogador_id == Jogador.id).group_by(Jogador.id).order_by(func.count(PeladaJogador.id).desc()).first()
    peladas_6x6 = db.query(Pelada).filter(Pelada.formato == FormatoPelada.seis_por_seis).count()
    peladas_5v5v5 = db.query(Pelada).filter(Pelada.formato == FormatoPelada.cinco_por_cinco_por_cinco).count()
    return DashboardStats(total_peladas=total_peladas, total_arrecadado=0.0, artilheiro=artilheiro_row.nome if artilheiro_row else None, jogador_mais_presente=presente_row.nome if presente_row else None, peladas_6x6=peladas_6x6, peladas_5v5v5=peladas_5v5v5)

@router.get("/jogadores", response_model=list[JogadorStats])
def stats_por_jogador(db: Session = Depends(get_db)):
    jogadores = db.query(Jogador).filter(Jogador.ativo == True).all()
    total_encerradas = db.query(Pelada).filter(Pelada.status == StatusPelada.encerrada).count()
    resultado = []
    for j in jogadores:
        participacoes = db.query(PeladaJogador).filter(PeladaJogador.jogador_id == j.id).all()
        total_part = len(participacoes)
        total_gols = sum(p.gols for p in participacoes)
        percentual = round((total_part / total_encerradas * 100), 1) if total_encerradas > 0 else 0.0
        resultado.append(JogadorStats(jogador_id=j.id, nome=j.nome, rating=j.rating, total_peladas=total_part, percentual_presenca=percentual, total_gols=total_gols, total_pago=0.0, vitorias=0, derrotas=0, empates=0))
    return sorted(resultado, key=lambda x: x.total_peladas, reverse=True)
EOF

cat > backend/main.py << 'EOF'
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
EOF

# ==================== FRONTEND ====================

cat > frontend/package.json << 'EOF'
{
  "name": "pelada-manager-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "axios": "^1.7.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.8",
    "tailwindcss": "^3.4.13",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47"
  }
}
EOF

cat > frontend/vite.config.js << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
EOF

cat > frontend/tailwind.config.js << 'EOF'
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
};
EOF

cat > frontend/postcss.config.js << 'EOF'
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
EOF

cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pelada Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

cat > frontend/src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

cat > frontend/src/main.jsx << 'EOF'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);
EOF

cat > frontend/src/App.jsx << 'EOF'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import NovaPelada from "./pages/NovaPelada";
import Pelada from "./pages/Pelada";
import Jogadores from "./pages/Jogadores";
import Stats from "./pages/Stats";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="nova-pelada" element={<NovaPelada />} />
          <Route path="pelada/:id" element={<Pelada />} />
          <Route path="jogadores" element={<Jogadores />} />
          <Route path="stats" element={<Stats />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
EOF

cat > frontend/src/api/client.js << 'EOF'
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export const getJogadores = () => api.get("/jogadores/");
export const criarJogador = (data) => api.post("/jogadores/", data);
export const atualizarJogador = (id, data) => api.patch(`/jogadores/${id}`, data);

export const getPeladas = () => api.get("/peladas/");
export const getPelada = (id) => api.get(`/peladas/${id}`);
export const criarPelada = (data) => api.post("/peladas/", data);
export const adicionarJogadores = (peladaId, nomes) => api.post(`/peladas/${peladaId}/jogadores`, { nomes });
export const getJogadoresPelada = (peladaId) => api.get(`/peladas/${peladaId}/jogadores`);
export const sortearTimes = (peladaId) => api.post(`/peladas/${peladaId}/sortear`);
export const atualizarPagamento = (peladaId, pjId, pago) => api.patch(`/peladas/${peladaId}/jogadores/${pjId}/pagamento`, { pago });
export const atualizarGols = (peladaId, pjId, gols) => api.patch(`/peladas/${peladaId}/jogadores/${pjId}/gols`, { gols });
export const getMensagemCobranca = (peladaId, chavePix = "") => api.get(`/peladas/${peladaId}/mensagem-cobranca`, { params: { chave_pix: chavePix } });

export const getDashboard = () => api.get("/stats/dashboard");
export const getStatsJogadores = () => api.get("/stats/jogadores");

export default api;
EOF

cat > frontend/src/components/Layout.jsx << 'EOF'
import { Outlet, NavLink } from "react-router-dom";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
        <span className="text-green-400 font-bold text-lg">Pelada Manager</span>
        <div className="flex gap-4 ml-4">
          {[{ to: "/", label: "Peladas", end: true }, { to: "/jogadores", label: "Jogadores" }, { to: "/stats", label: "Stats" }].map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `text-sm font-medium px-3 py-1 rounded transition-colors ${isActive ? "bg-green-500 text-gray-950" : "text-gray-400 hover:text-gray-100"}`}>{label}</NavLink>
          ))}
        </div>
        <NavLink to="/nova-pelada" className="ml-auto text-sm font-medium bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded transition-colors">+ Nova Pelada</NavLink>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8"><Outlet /></main>
    </div>
  );
}
EOF

cat > frontend/src/pages/Home.jsx << 'EOF'
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPeladas } from "../api/client";

export default function Home() {
  const [peladas, setPeladas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getPeladas().then((r) => setPeladas(r.data)).finally(() => setLoading(false)); }, []);

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Peladas</h1>
      {peladas.length === 0 && <p className="text-gray-500">Nenhuma pelada ainda. Crie a primeira!</p>}
      <div className="flex flex-col gap-3">
        {peladas.map((p) => (
          <Link key={p.id} to={`/pelada/${p.id}`} className="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 flex items-center justify-between hover:border-green-600 transition-colors">
            <div>
              <p className="font-semibold">{new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}</p>
              <p className="text-sm text-gray-400 mt-0.5">{p.formato ?? "—"} · {p.total_jogadores} jogadores · {p.total_pagos}/{p.total_jogadores} pagos</p>
            </div>
            <div className="text-right">
              <span className={`text-sm font-medium ${p.status === "aberta" ? "text-yellow-400" : "text-gray-500"}`}>{p.status}</span>
              {p.valor_por_jogador && <p className="text-sm text-gray-400">R$ {p.valor_por_jogador.toFixed(2)}/pessoa</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
EOF

cat > frontend/src/pages/NovaPelada.jsx << 'EOF'
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { criarPelada, adicionarJogadores } from "../api/client";

export default function NovaPelada() {
  const navigate = useNavigate();
  const [data, setData] = useState("");
  const [listaBruta, setListaBruta] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit() {
    if (!data) { setErro("Informe a data da pelada."); return; }
    setLoading(true);
    setErro("");
    try {
      const pelada = await criarPelada({ data });
      const id = pelada.data.id;
      if (listaBruta.trim()) {
        const nomes = listaBruta.split("\n").map((l) => l.replace(/^\d+[\.\-\)]\s*/, "").trim()).filter(Boolean);
        if (nomes.length > 0) await adicionarJogadores(id, nomes);
      }
      navigate(`/pelada/${id}`);
    } catch { setErro("Erro ao criar pelada."); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Nova Pelada</h1>
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Data</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-3 py-2 w-full text-gray-100 focus:outline-none focus:border-green-500" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Lista do WhatsApp <span className="text-gray-600">(cole aqui, um nome por linha)</span></label>
          <textarea rows={10} placeholder={"1. João\n2. Pedro\n3. Lucas"} value={listaBruta} onChange={(e) => setListaBruta(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-3 py-2 w-full text-gray-100 font-mono text-sm focus:outline-none focus:border-green-500 resize-none" />
        </div>
        {erro && <p className="text-red-400 text-sm">{erro}</p>}
        <button onClick={handleSubmit} disabled={loading} className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded transition-colors">{loading ? "Criando..." : "Criar Pelada"}</button>
      </div>
    </div>
  );
}
EOF

cat > frontend/src/pages/Pelada.jsx << 'EOF'
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPelada, getJogadoresPelada, sortearTimes, atualizarPagamento, atualizarGols, getMensagemCobranca } from "../api/client";

export default function Pelada() {
  const { id } = useParams();
  const [pelada, setPelada] = useState(null);
  const [jogadores, setJogadores] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    const [p, j] = await Promise.all([getPelada(id), getJogadoresPelada(id)]);
    setPelada(p.data);
    setJogadores(j.data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [id]);

  async function handleSortear() { await sortearTimes(id); carregar(); }

  async function togglePago(pj) {
    await atualizarPagamento(id, pj.id, !pj.pago);
    setJogadores((prev) => prev.map((j) => j.id === pj.id ? { ...j, pago: !j.pago } : j));
  }

  async function handleGols(pj, delta) {
    const novo = Math.max(0, pj.gols + delta);
    await atualizarGols(id, pj.id, novo);
    setJogadores((prev) => prev.map((j) => j.id === pj.id ? { ...j, gols: novo } : j));
  }

  async function gerarCobranca() { const r = await getMensagemCobranca(id); setMensagem(r.data.mensagem); }
  async function copiar() { await navigator.clipboard.writeText(mensagem); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  const porTime = jogadores.reduce((acc, j) => { const k = j.time || "sem_time"; if (!acc[k]) acc[k] = []; acc[k].push(j); return acc; }, {});
  const semTime = porTime["sem_time"] || [];
  const times = Object.entries(porTime).filter(([k]) => k !== "sem_time");
  const pendentes = jogadores.filter((j) => !j.pago);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pelada {new Date(pelada.data + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</h1>
          <p className="text-gray-400 mt-1">{pelada.formato ?? "—"} · {jogadores.length} jogadores{pelada.valor_por_jogador && ` · R$ ${pelada.valor_por_jogador.toFixed(2)}/pessoa`}</p>
        </div>
        <button onClick={handleSortear} className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded transition-colors">Sortear Times</button>
      </div>

      {times.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {times.map(([label, lista]) => {
            const media = (lista.reduce((s, j) => s + j.rating, 0) / lista.length).toFixed(1);
            return (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <p className="font-semibold mb-3">Time {label} <span className="text-gray-500 font-normal text-sm">média {media}</span></p>
                <div className="flex flex-col gap-2">
                  {lista.map((j) => (
                    <div key={j.id} className="flex items-center justify-between">
                      <span className="text-sm">{j.nome}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleGols(j, -1)} className="text-gray-600 hover:text-white w-5 text-center">−</button>
                        <span className="text-sm w-4 text-center">{j.gols}</span>
                        <button onClick={() => handleGols(j, 1)} className="text-gray-600 hover:text-white w-5 text-center">+</button>
                        <button onClick={() => togglePago(j)} className={`text-xs px-2 py-0.5 rounded ml-1 ${j.pago ? "bg-green-800 text-green-200" : "bg-gray-700 text-gray-400"}`}>{j.pago ? "Pago" : "Pendente"}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {semTime.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8">
          <p className="font-semibold mb-3 text-gray-400">Lista ({semTime.length})</p>
          <div className="flex flex-col gap-2">
            {semTime.map((j) => (
              <div key={j.id} className="flex items-center justify-between">
                <span className="text-sm">{j.nome} <span className="text-gray-600">({j.rating})</span></span>
                <button onClick={() => togglePago(j)} className={`text-xs px-2 py-0.5 rounded ${j.pago ? "bg-green-800 text-green-200" : "bg-gray-700 text-gray-400"}`}>{j.pago ? "Pago" : "Pendente"}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold">Pagamentos <span className="text-gray-500 font-normal text-sm">{jogadores.filter((j) => j.pago).length}/{jogadores.length} pagos</span></p>
          <button onClick={gerarCobranca} disabled={pendentes.length === 0} className="text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 px-3 py-1 rounded transition-colors">Gerar mensagem</button>
        </div>
        {mensagem && (
          <div className="mt-2">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-950 rounded p-3 font-sans">{mensagem}</pre>
            <button onClick={copiar} className="mt-2 text-sm text-green-400 hover:text-green-300">{copiado ? "Copiado!" : "Copiar"}</button>
          </div>
        )}
      </div>
    </div>
  );
}
EOF

cat > frontend/src/pages/Jogadores.jsx << 'EOF'
import { useEffect, useState } from "react";
import { getJogadores, criarJogador, atualizarJogador } from "../api/client";

export default function Jogadores() {
  const [jogadores, setJogadores] = useState([]);
  const [nome, setNome] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(true);

  async function carregar() { const r = await getJogadores(); setJogadores(r.data); setLoading(false); }
  useEffect(() => { carregar(); }, []);

  async function handleCriar() {
    if (!nome.trim()) return;
    await criarJogador({ nome: nome.trim(), rating: Number(rating) });
    setNome(""); setRating(5); carregar();
  }

  async function handleRatingChange(id, novoRating) {
    await atualizarJogador(id, { rating: Number(novoRating) });
    setJogadores((prev) => prev.map((j) => j.id === id ? { ...j, rating: Number(novoRating) } : j));
  }

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Jogadores</h1>
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8">
        <p className="text-sm text-gray-400 mb-3">Novo jogador</p>
        <div className="flex gap-3 flex-wrap">
          <input type="text" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCriar()} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:border-green-500" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Rating</label>
            <input type="number" min={1} max={10} step={0.5} value={rating} onChange={(e) => setRating(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm w-20 focus:outline-none focus:border-green-500" />
          </div>
          <button onClick={handleCriar} className="bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-4 py-2 rounded transition-colors">Adicionar</button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {jogadores.map((j) => (
          <div key={j.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="font-medium">{j.nome}</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Rating</label>
                <input type="number" min={1} max={10} step={0.5} value={j.rating} onChange={(e) => handleRatingChange(j.id, e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm w-16 focus:outline-none focus:border-green-500" />
              </div>
              <button onClick={() => atualizarJogador(j.id, { ativo: false }).then(carregar)} className="text-xs text-gray-600 hover:text-red-400 transition-colors">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
EOF

cat > frontend/src/pages/Stats.jsx << 'EOF'
import { useEffect, useState } from "react";
import { getDashboard, getStatsJogadores } from "../api/client";

function Card({ label, value }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function Stats() {
  const [dash, setDash] = useState(null);
  const [jogadores, setJogadores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboard(), getStatsJogadores()]).then(([d, j]) => { setDash(d.data); setJogadores(j.data); setLoading(false); });
  }, []);

  if (loading) return <p className="text-gray-500">Carregando...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Estatísticas</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        <Card label="Peladas realizadas" value={dash.total_peladas} />
        <Card label="Artilheiro" value={dash.artilheiro ?? "—"} />
        <Card label="Mais presente" value={dash.jogador_mais_presente ?? "—"} />
        <Card label="Peladas 6x6" value={dash.peladas_6x6} />
        <Card label="Peladas 5v5v5" value={dash.peladas_5v5v5} />
      </div>
      <h2 className="text-lg font-semibold mb-3">Por jogador</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-800">
              <th className="pb-2 pr-4">Jogador</th>
              <th className="pb-2 pr-4">Rating</th>
              <th className="pb-2 pr-4">Peladas</th>
              <th className="pb-2 pr-4">Presença</th>
              <th className="pb-2">Gols</th>
            </tr>
          </thead>
          <tbody>
            {jogadores.map((j) => (
              <tr key={j.jogador_id} className="border-b border-gray-800/50 hover:bg-gray-900">
                <td className="py-2.5 pr-4 font-medium">{j.nome}</td>
                <td className="py-2.5 pr-4 text-gray-400">{j.rating}</td>
                <td className="py-2.5 pr-4">{j.total_peladas}</td>
                <td className="py-2.5 pr-4 text-gray-400">{j.percentual_presenca}%</td>
                <td className="py-2.5">{j.total_gols}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
EOF

echo ""
echo "Pronto! Estrutura criada com sucesso."
echo ""
echo "Próximos passos:"
echo "  Backend:  cd backend && uv venv && source .venv/bin/activate && uv pip install -r requirements.txt && uvicorn main:app --reload"
echo "  Frontend: cd frontend && npm install && npm run dev"
