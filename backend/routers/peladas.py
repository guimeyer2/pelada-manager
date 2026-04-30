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
