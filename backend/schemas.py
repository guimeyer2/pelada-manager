import json
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date, datetime
from models import MatchFormat, MatchStatus, Team


class PlayerCreate(BaseModel):
    name: str
    rating: float = Field(5.0, ge=1.0, le=10.0)
    active: bool = True
    aliases: list[str] = []


class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    rating: Optional[float] = Field(None, ge=1.0, le=10.0)
    active: Optional[bool] = None
    aliases: Optional[list[str]] = None


class PlayerRead(BaseModel):
    id: int
    name: str
    rating: float
    active: bool
    aliases: list[str] = []
    created_at: datetime
    model_config = {"from_attributes": True}

    @field_validator("aliases", mode="before")
    @classmethod
    def parse_aliases(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []


class MatchCreate(BaseModel):
    date: date


class MatchRead(BaseModel):
    id: int
    date: date
    format: Optional[MatchFormat]
    fee_per_player: Optional[float]
    status: MatchStatus
    created_at: datetime
    total_players: Optional[int] = 0
    total_paid: Optional[int] = 0
    organizer_goals: int = 0
    score_a: Optional[int] = None
    score_b: Optional[int] = None
    model_config = {"from_attributes": True}


class AddPlayersInput(BaseModel):
    names: list[str]


class MatchPlayerRead(BaseModel):
    id: int
    player_id: int
    name: str
    rating: float
    team: Optional[Team]
    paid: bool
    goals: int
    model_config = {"from_attributes": True}


class PaymentUpdate(BaseModel):
    paid: bool


class GoalsUpdate(BaseModel):
    goals: int = Field(..., ge=0)


class OrganizerGoalsUpdate(BaseModel):
    goals: int = Field(..., ge=0)


class ScoreUpdate(BaseModel):
    score_a: int = Field(..., ge=0)
    score_b: int = Field(..., ge=0)


class DrawResult(BaseModel):
    teams: dict[str, list[MatchPlayerRead]]
    average_per_team: dict[str, float]


class PlayerStats(BaseModel):
    player_id: int
    name: str
    rating: float
    total_matches: int
    attendance_rate: float
    total_goals: int
    total_paid_amount: float


class DashboardStats(BaseModel):
    total_matches: int
    total_collected: float
    top_scorer: Optional[str]
    most_present_player: Optional[str]
    matches_6x6: int
    matches_5v5v5: int
    my_total_goals: int
    my_goals_6x6: int
