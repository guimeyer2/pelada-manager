from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from database import get_db
from models import Match, MatchPlayer, Player, MatchStatus, MatchFormat
from schemas import PlayerStats, DashboardStats

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(db: Session = Depends(get_db)):
    """Aggregate stats across all closed matches."""
    closed_matches = (
        db.query(Match)
        .filter(Match.status == MatchStatus.closed)
        .options(joinedload(Match.participations))
        .all()
    )
    total_matches = len(closed_matches)
    total_collected = round(
        sum(
            (m.fee_per_player or 0) * sum(1 for p in m.participations if p.paid)
            for m in closed_matches
        ),
        2,
    )
    top_scorer_row = (
        db.query(Player.name, func.sum(MatchPlayer.goals).label("total"))
        .join(MatchPlayer, MatchPlayer.player_id == Player.id)
        .group_by(Player.id)
        .order_by(func.sum(MatchPlayer.goals).desc())
        .first()
    )
    most_present_row = (
        db.query(Player.name, func.count(MatchPlayer.id).label("total"))
        .join(MatchPlayer, MatchPlayer.player_id == Player.id)
        .group_by(Player.id)
        .order_by(func.count(MatchPlayer.id).desc())
        .first()
    )
    matches_6x6 = db.query(Match).filter(Match.format == MatchFormat.six_vs_six).count()
    matches_5v5v5 = db.query(Match).filter(Match.format == MatchFormat.five_vs_five_vs_five).count()
    my_total_goals = sum(m.organizer_goals or 0 for m in closed_matches)
    my_goals_6x6 = sum(
        m.organizer_goals or 0
        for m in closed_matches
        if m.format == MatchFormat.six_vs_six
    )

    return DashboardStats(
        total_matches=total_matches,
        total_collected=total_collected,
        top_scorer=top_scorer_row.name if top_scorer_row else None,
        most_present_player=most_present_row.name if most_present_row else None,
        matches_6x6=matches_6x6,
        matches_5v5v5=matches_5v5v5,
        my_total_goals=my_total_goals,
        my_goals_6x6=my_goals_6x6,
    )


@router.get("/players", response_model=list[PlayerStats])
def player_stats(db: Session = Depends(get_db)):
    """Per-player stats restricted to closed matches only."""
    closed_ids = {
        m.id for m in db.query(Match).filter(Match.status == MatchStatus.closed).all()
    }
    total_closed = len(closed_ids)

    players = db.query(Player).filter(Player.active == True).all()

    # Load all entries at once to avoid N+1 queries
    all_entries = (
        db.query(MatchPlayer)
        .options(joinedload(MatchPlayer.match))
        .all()
    )
    entries_by_player: dict[int, list[MatchPlayer]] = {}
    for entry in all_entries:
        entries_by_player.setdefault(entry.player_id, []).append(entry)

    result = []
    for player in players:
        closed_entries = [
            e for e in entries_by_player.get(player.id, [])
            if e.match_id in closed_ids
        ]
        total_matches = len(closed_entries)
        total_goals = sum(e.goals for e in closed_entries)
        total_paid_amount = round(
            sum((e.match.fee_per_player or 0) for e in closed_entries if e.paid), 2
        )
        attendance_rate = round(total_matches / total_closed * 100, 1) if total_closed > 0 else 0.0

        result.append(PlayerStats(
            player_id=player.id,
            name=player.name,
            rating=player.rating,
            total_matches=total_matches,
            attendance_rate=attendance_rate,
            total_goals=total_goals,
            total_paid_amount=total_paid_amount,
        ))

    return sorted(result, key=lambda x: x.total_matches, reverse=True)
