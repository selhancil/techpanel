import datetime
from sqlalchemy import (
    Column, Integer, BigInteger, String, Numeric,
    Boolean, SmallInteger, ForeignKey, UniqueConstraint, Table,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import relationship
from db import Base


# Many-to-many association table: Symbol <-> MarketGroup
symbol_groups = Table(
    "symbol_groups",
    Base.metadata,
    Column("symbol_id", Integer, ForeignKey("symbols.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", Integer, ForeignKey("market_groups.id", ondelete="CASCADE"), primary_key=True),
)


class Market(Base):
    __tablename__ = "markets"

    id            = Column(Integer, primary_key=True)
    name          = Column(String(100), unique=True, nullable=False)
    display_order = Column(Integer, default=0)

    groups  = relationship("MarketGroup", back_populates="market",
                           cascade="all, delete-orphan",
                           order_by="MarketGroup.display_order")
    symbols = relationship("Symbol", back_populates="market")


class MarketGroup(Base):
    __tablename__ = "market_groups"
    __table_args__ = (UniqueConstraint("market_id", "name"),)

    id            = Column(Integer, primary_key=True)
    market_id     = Column(Integer, ForeignKey("markets.id", ondelete="CASCADE"), nullable=False)
    name          = Column(String(100), nullable=False)
    display_order = Column(Integer, default=0)

    market  = relationship("Market", back_populates="groups")
    symbols = relationship("Symbol", secondary=symbol_groups, back_populates="groups")


class Symbol(Base):
    __tablename__ = "symbols"

    id         = Column(Integer, primary_key=True)
    ticker     = Column(String(20), unique=True, nullable=False)
    name       = Column(String(255))
    sector     = Column(String(100))
    industry   = Column(String(100))
    currency   = Column(String(10), default="USD")
    exchange   = Column(String(50))
    active     = Column(Boolean, default=True)
    market_id  = Column(Integer, ForeignKey("markets.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)

    market     = relationship("Market", back_populates="symbols")
    groups     = relationship("MarketGroup", secondary=symbol_groups, back_populates="symbols")
    prices     = relationship("PriceData",          back_populates="symbol")
    indicators = relationship("TechnicalIndicator", back_populates="symbol")
    signals    = relationship("Signal",             back_populates="symbol")


class PriceData(Base):
    __tablename__ = "price_data"
    __table_args__ = (UniqueConstraint("symbol_id", "ts", "interval"),)

    id        = Column(BigInteger, primary_key=True)
    symbol_id = Column(Integer, ForeignKey("symbols.id", ondelete="CASCADE"), nullable=False)
    ts        = Column(TIMESTAMP(timezone=True), nullable=False)
    interval  = Column(String(10), default="1d")
    open      = Column(Numeric(18, 6))
    high      = Column(Numeric(18, 6))
    low       = Column(Numeric(18, 6))
    close     = Column(Numeric(18, 6))
    volume    = Column(BigInteger)
    adj_close = Column(Numeric(18, 6))

    symbol = relationship("Symbol", back_populates="prices")


class TechnicalIndicator(Base):
    __tablename__ = "technical_indicators"
    __table_args__ = (UniqueConstraint("symbol_id", "ts", "interval"),)

    id                   = Column(BigInteger, primary_key=True)
    symbol_id            = Column(Integer, ForeignKey("symbols.id", ondelete="CASCADE"), nullable=False)
    ts                   = Column(TIMESTAMP(timezone=True), nullable=False)
    interval             = Column(String(10), default="1d")
    rsi_14               = Column(Numeric(10, 4))
    sma_20               = Column(Numeric(18, 6))
    sma_50               = Column(Numeric(18, 6))
    sma_200              = Column(Numeric(18, 6))
    ema_9                = Column(Numeric(18, 6))
    ema_21               = Column(Numeric(18, 6))
    ema_50               = Column(Numeric(18, 6))
    supertrend           = Column(Numeric(18, 6))
    supertrend_direction = Column(SmallInteger)
    ichimoku_span_a      = Column(Numeric(18, 6))
    ichimoku_span_b      = Column(Numeric(18, 6))
    computed_at          = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)

    symbol = relationship("Symbol", back_populates="indicators")


class Signal(Base):
    __tablename__ = "signals"
    __table_args__ = (UniqueConstraint("symbol_id", "ts", "interval", "indicator"),)

    id          = Column(BigInteger, primary_key=True)
    symbol_id   = Column(Integer, ForeignKey("symbols.id", ondelete="CASCADE"), nullable=False)
    ts          = Column(TIMESTAMP(timezone=True), nullable=False)
    interval    = Column(String(10), default="1d")
    indicator   = Column(String(50), nullable=False)
    signal      = Column(String(10), nullable=False)
    value       = Column(Numeric(18, 6))
    close_price = Column(Numeric(18, 6))
    created_at  = Column(TIMESTAMP(timezone=True), default=datetime.datetime.utcnow)

    symbol = relationship("Symbol", back_populates="signals")
