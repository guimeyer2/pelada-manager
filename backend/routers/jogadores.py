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
