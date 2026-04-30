from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base

class FormatoPelada(str, enum.Enum):
    seis_por_seis = "6x6"
    cinco_por_cinco_por_cinco = "5v5v5"

class StatusPelada(str, enum.Enum):
    aberta = "aberta"
    encerrada = "encerrada"

class Time(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"

class Jogador(Base):
    __tablename__ = "jogadores"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    rating = Column(Float, default=5.0)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    participacoes = relationship("PeladaJogador", back_populates="jogador")

class Pelada(Base):
    __tablename__ = "peladas"
    id = Column(Integer, primary_key=True, index=True)
    data = Column(Date, nullable=False)
    formato = Column(Enum(FormatoPelada), nullable=True)
    valor_por_jogador = Column(Float, nullable=True)
    status = Column(Enum(StatusPelada), default=StatusPelada.aberta)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    participacoes = relationship("PeladaJogador", back_populates="pelada")

class PeladaJogador(Base):
    __tablename__ = "pelada_jogadores"
    id = Column(Integer, primary_key=True, index=True)
    pelada_id = Column(Integer, ForeignKey("peladas.id"), nullable=False)
    jogador_id = Column(Integer, ForeignKey("jogadores.id"), nullable=False)
    time = Column(Enum(Time), nullable=True)
    pago = Column(Boolean, default=False)
    gols = Column(Integer, default=0)
    pelada = relationship("Pelada", back_populates="participacoes")
    jogador = relationship("Jogador", back_populates="participacoes")
