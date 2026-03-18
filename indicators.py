"""
indicators.py
Reads OHLCV from PostgreSQL, computes RSI / SMA / EMA / SuperTrend,
and upserts results into technical_indicators.

Libraries used:
  - ta  : RSI, SMA, EMA  (Python 3.14 + pandas 2.x compatible)
  - numpy/pandas : SuperTrend (implemented manually)

Usage:
    python indicators.py
"""

import logging

import numpy as np
import pandas as pd
from ta.momentum import RSIIndicator
from ta.trend import EMAIndicator, SMAIndicator
from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from config import (
    DEFAULT_INTERVAL,
    EMA_PERIODS,
    ICHIMOKU_BASE,
    ICHIMOKU_CONVERSION,
    ICHIMOKU_DISPLACEMENT,
    ICHIMOKU_SPAN_B,
    RSI_PERIOD,
    SMA_PERIODS,
    SUPERTREND_MULT,
    SUPERTREND_PERIOD,
)
from db import SessionLocal
from models import PriceData, Symbol, TechnicalIndicator

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def load_ohlcv(session, symbol_id: int, interval: str) -> pd.DataFrame:
    """Load the full price history for one symbol into a DataFrame."""
    rows = (
        session.query(PriceData)
        .filter_by(symbol_id=symbol_id, interval=interval)
        .order_by(PriceData.ts)
        .all()
    )
    if not rows:
        return pd.DataFrame()

    records = [
        {
            "ts":     r.ts,
            "open":   float(r.open),
            "high":   float(r.high),
            "low":    float(r.low),
            "close":  float(r.close),
            "volume": int(r.volume or 0),
        }
        for r in rows
    ]
    df = pd.DataFrame(records).set_index("ts")
    df.index = pd.to_datetime(df.index, utc=True)
    return df


def _supertrend(df: pd.DataFrame, period: int, multiplier: float):
    """
    Compute SuperTrend using numpy arrays (pandas 2.x safe).

    Returns:
        st_series   : pd.Series — the SuperTrend line value per candle
        dir_series  : pd.Series — +1 (bullish) or -1 (bearish)
    """
    high  = df["high"].to_numpy(dtype=float)
    low   = df["low"].to_numpy(dtype=float)
    close = df["close"].to_numpy(dtype=float)
    n     = len(df)

    # True Range
    tr = np.empty(n)
    tr[0] = high[0] - low[0]
    for i in range(1, n):
        tr[i] = max(
            high[i] - low[i],
            abs(high[i] - close[i - 1]),
            abs(low[i]  - close[i - 1]),
        )

    # ATR — Wilder's smoothing (seed with simple mean of first `period` values)
    atr = np.zeros(n)
    if n >= period:
        atr[period - 1] = np.mean(tr[:period])
        for i in range(period, n):
            atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period

    # Basic bands
    hl2         = (high + low) / 2.0
    basic_upper = hl2 + multiplier * atr
    basic_lower = hl2 - multiplier * atr

    # Final bands (state-dependent clamping)
    final_upper = basic_upper.copy()
    final_lower = basic_lower.copy()
    st        = np.full(n, np.nan)
    direction = np.zeros(n, dtype=int)

    for i in range(1, n):
        # Clamp upper band
        if basic_upper[i] < final_upper[i - 1] or close[i - 1] > final_upper[i - 1]:
            final_upper[i] = basic_upper[i]
        else:
            final_upper[i] = final_upper[i - 1]

        # Clamp lower band
        if basic_lower[i] > final_lower[i - 1] or close[i - 1] < final_lower[i - 1]:
            final_lower[i] = basic_lower[i]
        else:
            final_lower[i] = final_lower[i - 1]

        # SuperTrend line and direction
        if np.isnan(st[i - 1]):
            st[i]        = final_upper[i]
            direction[i] = -1
        elif st[i - 1] == final_upper[i - 1]:
            if close[i] <= final_upper[i]:
                st[i]        = final_upper[i]
                direction[i] = -1
            else:
                st[i]        = final_lower[i]
                direction[i] = 1
        else:
            if close[i] >= final_lower[i]:
                st[i]        = final_lower[i]
                direction[i] = 1
            else:
                st[i]        = final_upper[i]
                direction[i] = -1

    st_series  = pd.Series(st,        index=df.index)
    dir_series = pd.Series(direction,  index=df.index)
    dir_series = dir_series.replace(0, np.nan)

    return st_series, dir_series


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Compute all indicators on a OHLCV DataFrame and return it enriched."""
    df = df.copy()

    # RSI
    df[f"rsi_{RSI_PERIOD}"] = RSIIndicator(
        close=df["close"], window=RSI_PERIOD
    ).rsi()

    # SMAs
    for p in SMA_PERIODS:
        df[f"sma_{p}"] = SMAIndicator(close=df["close"], window=p).sma_indicator()

    # EMAs
    for p in EMA_PERIODS:
        df[f"ema_{p}"] = EMAIndicator(close=df["close"], window=p).ema_indicator()

    # SuperTrend
    df["supertrend"], df["supertrend_direction"] = _supertrend(
        df, period=SUPERTREND_PERIOD, multiplier=SUPERTREND_MULT
    )

    # Ichimoku Cloud (Senkou Span A & B only)
    tenkan = (
        df["high"].rolling(window=ICHIMOKU_CONVERSION).max()
        + df["low"].rolling(window=ICHIMOKU_CONVERSION).min()
    ) / 2.0
    kijun = (
        df["high"].rolling(window=ICHIMOKU_BASE).max()
        + df["low"].rolling(window=ICHIMOKU_BASE).min()
    ) / 2.0
    df["ichimoku_span_a"] = ((tenkan + kijun) / 2.0).shift(ICHIMOKU_DISPLACEMENT)
    df["ichimoku_span_b"] = (
        (
            df["high"].rolling(window=ICHIMOKU_SPAN_B).max()
            + df["low"].rolling(window=ICHIMOKU_SPAN_B).min()
        ) / 2.0
    ).shift(ICHIMOKU_DISPLACEMENT)

    return df


def upsert_indicators(session, symbol_id: int, df: pd.DataFrame, interval: str) -> int:
    """Upsert computed indicator rows into technical_indicators."""
    indicator_cols = [
        f"rsi_{RSI_PERIOD}", "sma_20", "sma_50", "sma_200",
        "ema_9", "ema_21", "ema_50",
        "supertrend", "supertrend_direction",
        "ichimoku_span_a", "ichimoku_span_b",
    ]
    # Column name mapping (DataFrame col → DB col)
    col_map = {f"rsi_{RSI_PERIOD}": "rsi_14"}

    tmp = df[indicator_cols].copy().reset_index()
    tmp.rename(columns={"index": "ts", **col_map}, inplace=True)
    tmp["symbol_id"] = symbol_id
    tmp["interval"] = interval

    # Replace NaN with None for PostgreSQL NULL
    tmp = tmp.where(tmp.notna(), None)

    # Convert supertrend_direction to int where not None
    tmp["supertrend_direction"] = tmp["supertrend_direction"].apply(
        lambda v: int(v) if v is not None else None
    )

    rows = tmp.to_dict("records")
    if not rows:
        return 0

    stmt = pg_insert(TechnicalIndicator.__table__).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["symbol_id", "ts", "interval"],
        set_={
            "rsi_14":               stmt.excluded.rsi_14,
            "sma_20":               stmt.excluded.sma_20,
            "sma_50":               stmt.excluded.sma_50,
            "sma_200":              stmt.excluded.sma_200,
            "ema_9":                stmt.excluded.ema_9,
            "ema_21":               stmt.excluded.ema_21,
            "ema_50":               stmt.excluded.ema_50,
            "supertrend":           stmt.excluded.supertrend,
            "supertrend_direction": stmt.excluded.supertrend_direction,
            "ichimoku_span_a":      stmt.excluded.ichimoku_span_a,
            "ichimoku_span_b":      stmt.excluded.ichimoku_span_b,
            "computed_at":          text("NOW()"),
        },
    )
    session.execute(stmt)
    return len(rows)


def run_indicators(interval: str = DEFAULT_INTERVAL):
    """Compute and store indicators for all active symbols (incremental)."""
    session = SessionLocal()
    try:
        symbols = session.query(Symbol).filter_by(active=True).all()
        for sym in symbols:
            log.info(f"[{sym.ticker}] Computing indicators...")
            df = load_ohlcv(session, sym.id, interval)
            if len(df) < max(SMA_PERIODS):
                log.warning(
                    f"[{sym.ticker}] Insufficient data ({len(df)} rows, "
                    f"need at least {max(SMA_PERIODS)}) — skipping"
                )
                continue

            # Find last computed timestamp for incremental upsert
            last_computed = (
                session.query(func.max(TechnicalIndicator.ts))
                .filter_by(symbol_id=sym.id, interval=interval)
                .scalar()
            )

            df = compute_indicators(df)

            # Only upsert new rows (after last computed timestamp)
            if last_computed is not None:
                df_new = df[df.index > last_computed]
            else:
                df_new = df

            if df_new.empty:
                log.info(f"[{sym.ticker}] Already up to date — no new rows")
                continue

            n = upsert_indicators(session, sym.id, df_new, interval)
            log.info(f"[{sym.ticker}] Upserted {n} new indicator rows")
        session.commit()
    except Exception as e:
        session.rollback()
        log.error(f"Indicator computation failed: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_indicators()
