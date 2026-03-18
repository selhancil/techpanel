"""
schemas.py
Pydantic response models for the FastAPI endpoints.
"""

from pydantic import BaseModel


class StatusRow(BaseModel):
    ticker: str
    group: str
    market: str
    close: str
    rsi: str
    rsi_zone: str
    supertrend: str
    sma_cross: str
    ema_cross: str
    price_sma200: str
    ichimoku_cloud: str
    updated: str


class ChangeRow(BaseModel):
    ticker: str
    when: str
    change: str
    change_short: str
    signal: str
    value: str


class TopGainer(BaseModel):
    ticker: str
    change_pct: float


class MarketSentiment(BaseModel):
    label: str
    bullish_pct: float
    bearish_pct: float


class DashboardMetrics(BaseModel):
    daily_new_buy_signals: int
    top_gainer: TopGainer | None
    market_sentiment: MarketSentiment
    total_assets: int
    recent_changes: int


class SymbolRow(BaseModel):
    ticker: str
    name: str
    exchange: str
    market: str
    market_id: int | None
    group: str
    group_ids: list[int]
    status: str
    active: bool
    added: str


class GroupOut(BaseModel):
    id: int
    name: str
    symbol_count: int


class MarketOut(BaseModel):
    id: int
    name: str
    display_order: int
    symbol_count: int
    groups: list[GroupOut]


class SearchResult(BaseModel):
    ticker: str
    name: str
    exchange: str


class MessageResponse(BaseModel):
    message: str
    success: bool
