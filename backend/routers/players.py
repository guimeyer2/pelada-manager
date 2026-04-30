import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Player
from schemas import PlayerCreate, PlayerRead, PlayerUpdate

router = APIRouter(prefix="/players", tags=["players"])


def _serialize_aliases(aliases: list[str]) -> str:
    return json.dumps([a.strip().lower() for a in aliases if a.strip()])


@router.get("/", response_model=list[PlayerRead])
def list_players(active_only: bool = True, db: Session = Depends(get_db)):
    query = db.query(Player)
    if active_only:
        query = query.filter(Player.active == True)
    return query.order_by(Player.rating.desc(), Player.name).all()


@router.post("/", response_model=PlayerRead, status_code=201)
def create_player(data: PlayerCreate, db: Session = Depends(get_db)):
    existing = db.query(Player).filter(Player.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Player with this name already exists")
    player = Player(
        name=data.name,
        rating=data.rating,
        active=data.active,
        aliases=_serialize_aliases(data.aliases),
    )
    db.add(player)
    db.commit()
    db.refresh(player)
    return player


@router.patch("/{player_id}", response_model=PlayerRead)
def update_player(player_id: int, data: PlayerUpdate, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    updates = data.model_dump(exclude_none=True)
    if "aliases" in updates:
        updates["aliases"] = _serialize_aliases(updates["aliases"])
    for field, value in updates.items():
        setattr(player, field, value)
    db.commit()
    db.refresh(player)
    return player


@router.delete("/{player_id}", status_code=204)
def deactivate_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    player.active = False
    db.commit()
