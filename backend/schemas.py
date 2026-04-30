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
