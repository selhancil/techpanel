"""
signals.py
Reads computed indicators from PostgreSQL, detects crossover / threshold
events, and upserts buy/sell signals into the signals table.

Signal logic:
  RSI        — BUY when RSI crosses UP through 30, SELL when crosses DOWN through 70
  SMA_CROSS  — BUY when SMA20 crosses above SMA50 (golden cross), SELL on death cross
  EMA_CROSS  — BUY when EMA9 crosses above EMA21, SELL when it crosses below
  SUPERTREND — BUY when direction flips -1→+1, SELL when +1→-1
  PRICE_SMA200 — BUY when price crosses above SMA200, SELL when below

Usage:
    python signals.py
"""

import logging
from datetime import datetime, timedelta, timezone

import pandas as pd
from sqlalchemy.dialects.postgresql import insert as pg_insert

from config import DEFAULT_INTERVAL, SIGNAL_LOOKBACK_DAYS
from db import SessionLocal
from models import PriceData, Signal, Symbol, TechnicalIndicator

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def load_indicators(session, symbol_id: int, interval: str) -> pd.DataFrame:
    """Load recent indicator + close price rows into a DataFrame."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=SIGNAL_LOOKBACK_DAYS)
    rows = (
        session.query(TechnicalIndicator, PriceData.close)
        .join(
            PriceData,
            (PriceData.symbol_id == TechnicalIndicator.symbol_id)
            & (PriceData.ts == TechnicalIndicator.ts)
            & (PriceData.interval == TechnicalIndicator.interval),
        )
        .filter(
            TechnicalIndicator.symbol_id == symbol_id,
            TechnicalIndicator.interval == interval,
            TechnicalIndicator.ts >= cutoff,
        )
        .order_by(TechnicalIndicator.ts)
        .all()
    )
    if not rows:
        return pd.DataFrame()

    records = [
        {
            "ts":                   r.TechnicalIndicator.ts,
            "rsi_14":               float(r.TechnicalIndicator.rsi_14 or 0),
            "sma_20":               float(r.TechnicalIndicator.sma_20 or 0),
            "sma_50":               float(r.TechnicalIndicator.sma_50 or 0),
            "sma_200":              float(r.TechnicalIndicator.sma_200 or 0),
            "ema_9":                float(r.TechnicalIndicator.ema_9 or 0),
            "ema_21":               float(r.TechnicalIndicator.ema_21 or 0),
            "supertrend_direction": int(r.TechnicalIndicator.supertrend_direction or 0),
            "supertrend":           float(r.TechnicalIndicator.supertrend or 0),
            "close":                float(r.close or 0),
        }
        for r in rows
    ]
    return pd.DataFrame(records).set_index("ts")


def detect_signals(df: pd.DataFrame, symbol_id: int, interval: str) -> list[dict]:
    """Scan indicator history and return all crossover/threshold signal dicts."""
    signals = []
    prev = df.shift(1)

    def add(ts, indicator, signal, value, close):
        signals.append(
            {
                "symbol_id":   symbol_id,
                "ts":          ts,
                "interval":    interval,
                "indicator":   indicator,
                "signal":      signal,
                "value":       float(value),
                "close_price": float(close),
            }
        )

    for i in range(1, len(df)):
        row  = df.iloc[i]
        prow = prev.iloc[i]
        ts   = df.index[i]

        # RSI threshold crossovers
        if prow.rsi_14 <= 30 < row.rsi_14:
            add(ts, "RSI", "BUY",  row.rsi_14, row.close)
        if prow.rsi_14 >= 70 > row.rsi_14:
            add(ts, "RSI", "SELL", row.rsi_14, row.close)

        # SMA golden / death cross (SMA20 vs SMA50)
        if prow.sma_20 <= prow.sma_50 and row.sma_20 > row.sma_50:
            add(ts, "SMA_CROSS", "BUY",  row.sma_20, row.close)
        if prow.sma_20 >= prow.sma_50 and row.sma_20 < row.sma_50:
            add(ts, "SMA_CROSS", "SELL", row.sma_20, row.close)

        # EMA cross (EMA9 vs EMA21)
        if prow.ema_9 <= prow.ema_21 and row.ema_9 > row.ema_21:
            add(ts, "EMA_CROSS", "BUY",  row.ema_9, row.close)
        if prow.ema_9 >= prow.ema_21 and row.ema_9 < row.ema_21:
            add(ts, "EMA_CROSS", "SELL", row.ema_9, row.close)

        # SuperTrend direction flip
        if prow.supertrend_direction == -1 and row.supertrend_direction == 1:
            add(ts, "SUPERTREND", "BUY",  row.supertrend, row.close)
        if prow.supertrend_direction == 1 and row.supertrend_direction == -1:
            add(ts, "SUPERTREND", "SELL", row.supertrend, row.close)

        # Price vs SMA200 crossover
        if prow.sma_200 and row.sma_200:
            if prow.close <= prow.sma_200 and row.close > row.sma_200:
                add(ts, "PRICE_SMA200", "BUY",  row.sma_200, row.close)
            if prow.close >= prow.sma_200 and row.close < row.sma_200:
                add(ts, "PRICE_SMA200", "SELL", row.sma_200, row.close)

    return signals


def upsert_signals(session, signals: list[dict]) -> int:
    """Upsert signal rows; update signal/value if the same event is re-detected."""
    if not signals:
        return 0
    stmt = pg_insert(Signal.__table__).values(signals)
    stmt = stmt.on_conflict_do_update(
        index_elements=["symbol_id", "ts", "interval", "indicator"],
        set_={
            "signal":      stmt.excluded.signal,
            "value":       stmt.excluded.value,
            "close_price": stmt.excluded.close_price,
        },
    )
    session.execute(stmt)
    return len(signals)


def run_signals(interval: str = DEFAULT_INTERVAL):
    """Detect and store signals for all active symbols."""
    session = SessionLocal()
    try:
        symbols = session.query(Symbol).filter_by(active=True).all()
        for sym in symbols:
            log.info(f"[{sym.ticker}] Detecting signals...")
            df = load_indicators(session, sym.id, interval)
            if df.empty:
                log.warning(f"[{sym.ticker}] No indicator data — skipping")
                continue
            signals = detect_signals(df, sym.id, interval)
            n = upsert_signals(session, signals)
            log.info(f"[{sym.ticker}] Upserted {n} signals")
        session.commit()
    except Exception as e:
        session.rollback()
        log.error(f"Signal detection failed: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_signals()
