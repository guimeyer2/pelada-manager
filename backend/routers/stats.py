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
