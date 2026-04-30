from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey, Enum, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


class MatchFormat(str, enum.Enum):
    six_vs_six = "6x6"
    five_vs_five_vs_five = "5v5v5"


class MatchStatus(str, enum.Enum):
    open = "open"
    closed = "closed"


class Team(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    rating = Column(Float, default=5.0)
    active = Column(Boolean, default=True)
    aliases = Column(Text, nullable=True, default="[]")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    participations = relationship("MatchPlayer", back_populates="player")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    format = Column(Enum(MatchFormat), nullable=True)
    fee_per_player = Column(Float, nullable=True)
    status = Column(Enum(MatchStatus), default=MatchStatus.open)
    organizer_goals = Column(Integer, default=0)
    score_a = Column(Integer, nullable=True)
    score_b = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    participations = relationship("MatchPlayer", back_populates="match")


class MatchPlayer(Base):
    __tablename__ = "match_players"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    team = Column(Enum(Team), nullable=True)
    paid = Column(Boolean, default=False)
    goals = Column(Integer, default=0)

    match = relationship("Match", back_populates="participations")
    player = relationship("Player", back_populates="participations")
