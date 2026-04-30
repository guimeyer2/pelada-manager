import random
from typing import NamedTuple


class PlayerForDraw(NamedTuple):
    id: int
    name: str
    rating: float


def draw_teams(
    players: list[PlayerForDraw],
    num_teams: int,
) -> tuple[dict[str, list[PlayerForDraw]], dict[str, float]]:
    """
    Distribute players into balanced teams using a snake draft.

    Snake draft order for 2 teams:  A B B A A B ...
    Snake draft order for 3 teams:  A B C C B A A B C ...

    Returns a (teams, averages) tuple where teams maps label → player list
    and averages maps label → mean rating.
    """
    if num_teams not in (2, 3):
        raise ValueError("num_teams must be 2 (6x6) or 3 (5v5v5)")

    labels = ["A", "B", "C"][:num_teams]
    teams: dict[str, list[PlayerForDraw]] = {label: [] for label in labels}

    sorted_players = sorted(players, key=lambda p: (-p.rating, random.random()))

    for i, player in enumerate(sorted_players):
        cycle = i // num_teams
        pos = i % num_teams
        idx = pos if cycle % 2 == 0 else (num_teams - 1) - pos
        teams[labels[idx]].append(player)

    averages = {
        label: round(sum(p.rating for p in team) / len(team), 2) if team else 0.0
        for label, team in teams.items()
    }

    return teams, averages


def determine_format(total_players: int) -> tuple[str, float] | tuple[None, None]:
    """Return (format_string, fee_per_player) for 12 or 15 players, else (None, None)."""
    if total_players == 12:
        return "6x6", 28.75
    if total_players == 15:
        return "5v5v5", 30.70
    return None, None
