import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from difflib import get_close_matches
from database import get_db
from models import Match, MatchPlayer, Player, MatchFormat, MatchStatus, Team
from schemas import (
    MatchCreate, MatchRead, MatchPlayerRead,
    AddPlayersInput, PaymentUpdate, GoalsUpdate, DrawResult,
    OrganizerGoalsUpdate, ScoreUpdate,
)
from services.draw import PlayerForDraw, draw_teams, determine_format
from services.formatter import payment_reminder_message

router = APIRouter(prefix="/matches", tags=["matches"])


def _to_match_read(match: Match) -> MatchRead:
    """Build a MatchRead schema from a loaded Match ORM object."""
    total = len(match.participations)
    paid = sum(1 for p in match.participations if p.paid)
    return MatchRead(
        id=match.id,
        date=match.date,
        format=match.format,
        fee_per_player=match.fee_per_player,
        status=match.status,
        created_at=match.created_at,
        total_players=total,
        total_paid=paid,
        organizer_goals=match.organizer_goals or 0,
        score_a=match.score_a,
        score_b=match.score_b,
    )


def _to_mp_read(mp: MatchPlayer) -> MatchPlayerRead:
    """Build a MatchPlayerRead schema from a loaded MatchPlayer ORM object."""
    return MatchPlayerRead(
        id=mp.id,
        player_id=mp.player_id,
        name=mp.player.name,
        rating=mp.player.rating,
        team=mp.team,
        paid=mp.paid,
        goals=mp.goals,
    )


@router.get("/", response_model=list[MatchRead])
def list_matches(db: Session = Depends(get_db)):
    """Return all matches ordered by date descending."""
    matches = (
        db.query(Match)
        .options(joinedload(Match.participations))
        .order_by(Match.date.desc())
        .all()
    )
    return [_to_match_read(m) for m in matches]


@router.post("/", response_model=MatchRead, status_code=201)
def create_match(data: MatchCreate, db: Session = Depends(get_db)):
    """Create a new match."""
    match = Match(date=data.date)
    db.add(match)
    db.commit()
    db.refresh(match)
    return _to_match_read(match)


@router.get("/{match_id}", response_model=MatchRead)
def get_match(match_id: int, db: Session = Depends(get_db)):
    """Return a single match by ID."""
    match = (
        db.query(Match)
        .options(joinedload(Match.participations))
        .filter(Match.id == match_id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return _to_match_read(match)


@router.patch("/{match_id}/close", response_model=MatchRead)
def close_match(match_id: int, db: Session = Depends(get_db)):
    """Mark a match as closed so it counts toward historical stats."""
    match = (
        db.query(Match)
        .options(joinedload(Match.participations))
        .filter(Match.id == match_id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    match.status = MatchStatus.closed
    db.commit()
    db.refresh(match)
    return _to_match_read(match)


@router.patch("/{match_id}/reopen", response_model=MatchRead)
def reopen_match(match_id: int, db: Session = Depends(get_db)):
    """Reopen a closed match."""
    match = (
        db.query(Match)
        .options(joinedload(Match.participations))
        .filter(Match.id == match_id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    match.status = MatchStatus.open
    db.commit()
    db.refresh(match)
    return _to_match_read(match)


@router.post("/{match_id}/players", response_model=list[MatchPlayerRead])
def add_players(match_id: int, data: AddPlayersInput, db: Session = Depends(get_db)):
    """
    Import a player list into a match by name.
    Fuzzy-matches against existing active players (cutoff 0.8);
    creates a new player at rating 5.0 when no match is found.
    Automatically sets the match format and fee at 12 or 15 players.
    """
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    all_players = db.query(Player).filter(Player.active == True).all()
    by_name = {p.name.lower(): p for p in all_players}

    alias_map: dict[str, Player] = {}
    for p in all_players:
        try:
            aliases = json.loads(p.aliases or "[]")
        except Exception:
            aliases = []
        for alias in aliases:
            alias_map[alias.lower()] = p

    for raw in data.names:
        name = raw.strip()
        if not name:
            continue
        player = by_name.get(name.lower()) or alias_map.get(name.lower())
        if not player:
            close = get_close_matches(name.lower(), by_name.keys(), n=1, cutoff=0.8)
            if close:
                player = by_name[close[0]]
        if not player:
            player = Player(name=name, rating=5.0)
            db.add(player)
            db.flush()
            by_name[name.lower()] = player
        if not db.query(MatchPlayer).filter_by(match_id=match_id, player_id=player.id).first():
            db.add(MatchPlayer(match_id=match_id, player_id=player.id))

    db.commit()

    total = db.query(MatchPlayer).filter_by(match_id=match_id).count()
    fmt, fee = determine_format(total)
    if fmt:
        match.format = MatchFormat(fmt)
        match.fee_per_player = fee
        db.commit()

    entries = (
        db.query(MatchPlayer)
        .options(joinedload(MatchPlayer.player))
        .filter_by(match_id=match_id)
        .all()
    )
    return [_to_mp_read(mp) for mp in entries]


@router.get("/{match_id}/players", response_model=list[MatchPlayerRead])
def list_match_players(match_id: int, db: Session = Depends(get_db)):
    """Return all players registered for a match."""
    entries = (
        db.query(MatchPlayer)
        .options(joinedload(MatchPlayer.player))
        .filter_by(match_id=match_id)
        .all()
    )
    return [_to_mp_read(mp) for mp in entries]


@router.post("/{match_id}/draw", response_model=DrawResult)
def draw(match_id: int, db: Session = Depends(get_db)):
    """
    Assign players to balanced teams using snake draft.
    Persists team labels; re-running reshuffles them.
    """
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if not match.format:
        raise HTTPException(status_code=400, detail="Match format not yet determined")

    entries = (
        db.query(MatchPlayer)
        .options(joinedload(MatchPlayer.player))
        .filter_by(match_id=match_id)
        .all()
    )
    num_teams = 2 if match.format == MatchFormat.six_vs_six else 3
    players_for_draw = [
        PlayerForDraw(id=mp.player_id, name=mp.player.name, rating=mp.player.rating)
        for mp in entries
    ]

    teams_result, averages = draw_teams(players_for_draw, num_teams)

    entries_by_player = {mp.player_id: mp for mp in entries}
    for label, players in teams_result.items():
        for p in players:
            entries_by_player[p.id].team = Team(label)
    db.commit()

    teams_response = {
        label: [
            MatchPlayerRead(
                id=entries_by_player[p.id].id,
                player_id=p.id,
                name=p.name,
                rating=p.rating,
                team=Team(label),
                paid=entries_by_player[p.id].paid,
                goals=entries_by_player[p.id].goals,
            )
            for p in players
        ]
        for label, players in teams_result.items()
    }
    return DrawResult(teams=teams_response, average_per_team=averages)


@router.patch("/{match_id}/players/{mp_id}/payment", response_model=MatchPlayerRead)
def update_payment(match_id: int, mp_id: int, data: PaymentUpdate, db: Session = Depends(get_db)):
    """Toggle the paid status for a player in a match."""
    mp = (
        db.query(MatchPlayer)
        .options(joinedload(MatchPlayer.player))
        .filter_by(id=mp_id, match_id=match_id)
        .first()
    )
    if not mp:
        raise HTTPException(status_code=404, detail="Match player entry not found")
    mp.paid = data.paid
    db.commit()
    db.refresh(mp)
    return _to_mp_read(mp)


@router.patch("/{match_id}/players/{mp_id}/goals", response_model=MatchPlayerRead)
def update_goals(match_id: int, mp_id: int, data: GoalsUpdate, db: Session = Depends(get_db)):
    """Update the goal count for a player in a match."""
    mp = (
        db.query(MatchPlayer)
        .options(joinedload(MatchPlayer.player))
        .filter_by(id=mp_id, match_id=match_id)
        .first()
    )
    if not mp:
        raise HTTPException(status_code=404, detail="Match player entry not found")
    mp.goals = data.goals
    db.commit()
    db.refresh(mp)
    return _to_mp_read(mp)


@router.patch("/{match_id}/organizer-goals", response_model=MatchRead)
def update_organizer_goals(match_id: int, data: OrganizerGoalsUpdate, db: Session = Depends(get_db)):
    """Update organizer's personal goal count for this match."""
    match = (
        db.query(Match)
        .options(joinedload(Match.participations))
        .filter(Match.id == match_id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    match.organizer_goals = data.goals
    db.commit()
    db.refresh(match)
    return _to_match_read(match)


@router.patch("/{match_id}/score", response_model=MatchRead)
def update_score(match_id: int, data: ScoreUpdate, db: Session = Depends(get_db)):
    """Update the final score for a 2-team match."""
    match = (
        db.query(Match)
        .options(joinedload(Match.participations))
        .filter(Match.id == match_id)
        .first()
    )
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    match.score_a = data.score_a
    match.score_b = data.score_b
    db.commit()
    db.refresh(match)
    return _to_match_read(match)


@router.get("/{match_id}/payment-reminder")
def get_payment_reminder(match_id: int, pix_key: str = "", db: Session = Depends(get_db)):
    """Generate a WhatsApp-ready payment reminder for all unpaid players."""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    unpaid = (
        db.query(MatchPlayer)
        .options(joinedload(MatchPlayer.player))
        .filter_by(match_id=match_id, paid=False)
        .all()
    )
    names = [mp.player.name for mp in unpaid]
    return {"message": payment_reminder_message(match.date, names, match.fee_per_player or 0, pix_key)}
