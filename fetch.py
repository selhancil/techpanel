"""
fetch.py
Fetches OHLCV data for configured tickers from Yahoo Finance and
upserts into the price_data table.

Fetch strategy (date-aware, three modes):
  Mode 1 — No data in DB:         fetch period="300d" (initial bootstrap)
  Mode 2 — DB already up to date: skip API call entirely (returns None)
  Mode 3 — Gap exists:            fetch only the missing calendar days + 1 buffer

Usage:
    python fetch.py
"""

import logging
from datetime import datetime, timedelta, timezone

import pandas as pd
import yfinance as yf
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from config import DEFAULT_INTERVAL, RETENTION_DAYS
from db import SessionLocal
from models import PriceData, Signal, Symbol, TechnicalIndicator

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def ensure_symbol(session, ticker: str) -> int:
    """Insert symbol if not present; return its id."""
    sym = session.query(Symbol).filter_by(ticker=ticker).first()
    if sym is None:
        info = {}
        try:
            info = yf.Ticker(ticker).info
        except Exception:
            pass
        sym = Symbol(
            ticker=ticker,
            name=info.get("shortName"),
            sector=info.get("sector"),
            industry=info.get("industry"),
            currency=info.get("currency", "USD"),
            exchange=info.get("exchange"),
        )
        session.add(sym)
        session.flush()
    return sym.id


def get_fetch_params(session, symbol_id: int, interval: str) -> dict | None:
    """
    Determine yfinance download parameters based on what is already in the DB.

    Returns:
        dict  — kwargs to pass to yf.download (period or start/end)
        None  — data is already up to date; caller should skip
    """
    latest = (
        session.query(func.max(PriceData.ts))
        .filter_by(symbol_id=symbol_id, interval=interval)
        .scalar()
    )

    if latest is None:
        # Mode 1: no data at all → full historical bootstrap
        return {"period": "300d"}

    latest_date = latest.astimezone(timezone.utc).date()
    today = datetime.now(timezone.utc).date()

    if latest_date >= today:
        # Mode 2: today's data exists but may be stale (intraday) → re-fetch
        return {"period": "2d"}

    # Mode 3: gap exists → fetch only the missing days (+1 buffer)
    delta = (today - latest_date).days
    return {"period": f"{delta + 1}d"}


def fetch_ohlcv(ticker: str, interval: str, **kwargs) -> pd.DataFrame:
    """Download OHLCV from Yahoo Finance; return a clean DataFrame."""
    df = yf.download(
        ticker,
        interval=interval,
        auto_adjust=False,
        progress=False,
        **kwargs,
    )
    if df.empty:
        log.warning(f"No data returned for {ticker}")
        return df

    # yfinance returns MultiIndex columns when downloading a single ticker
    # with auto_adjust=False; flatten if needed
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df.index = pd.to_datetime(df.index, utc=True)
    df.rename(
        columns={
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
            "Adj Close": "adj_close",
        },
        inplace=True,
    )
    df.dropna(subset=["close"], inplace=True)
    return df


def upsert_price_data(session, symbol_id: int, df: pd.DataFrame, interval: str) -> int:
    """Bulk-insert OHLCV rows using ON CONFLICT DO UPDATE (idempotent)."""
    tmp = df.reset_index()
    # yfinance uses 'Date' as index name; reset_index may produce 'Date' or 'index'
    idx_col = tmp.columns[0]
    tmp.rename(columns={idx_col: "ts"}, inplace=True)
    tmp["symbol_id"] = symbol_id
    tmp["interval"] = interval
    tmp["adj_close"] = tmp["adj_close"].fillna(tmp["close"])
    for col in ("open", "high", "low", "close", "adj_close"):
        tmp[col] = tmp[col].fillna(0).astype(float)
    tmp["volume"] = tmp["volume"].fillna(0).astype(int)
    rows = tmp[["symbol_id", "ts", "interval", "open", "high", "low", "close", "volume", "adj_close"]].to_dict("records")
    if not rows:
        return 0
    stmt = pg_insert(PriceData.__table__).values(rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["symbol_id", "ts", "interval"],
        set_={
            "open": stmt.excluded.open,
            "high": stmt.excluded.high,
            "low": stmt.excluded.low,
            "close": stmt.excluded.close,
            "volume": stmt.excluded.volume,
            "adj_close": stmt.excluded.adj_close,
        },
    )
    session.execute(stmt)
    return len(rows)


def cleanup_old_data(session):
    """Delete rows older than RETENTION_DAYS from price_data, technical_indicators, signals."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    for model, name in [
        (PriceData, "price_data"),
        (TechnicalIndicator, "technical_indicators"),
        (Signal, "signals"),
    ]:
        n = session.query(model).filter(model.ts < cutoff).delete(synchronize_session=False)
        if n:
            log.info(f"Cleanup: deleted {n} old rows from {name}")


def run_fetch(tickers=None, interval=DEFAULT_INTERVAL):
    """Main entry point: fetch and store OHLCV for all tickers.

    If *tickers* is None, reads active symbols from the database.
    """
    session = SessionLocal()
    try:
        if tickers is None:
            symbols = session.query(Symbol).filter_by(active=True).all()
            tickers = [s.ticker for s in symbols]

        for ticker in tickers:
            log.info(f"[{ticker}] Checking fetch params...")
            symbol_id = ensure_symbol(session, ticker)
            params = get_fetch_params(session, symbol_id, interval)

            if params is None:
                log.info(f"[{ticker}] Already up to date — skipping API call")
                continue

            log.info(f"[{ticker}] Fetching with params: {params}")
            df = fetch_ohlcv(ticker, interval=interval, **params)
            if df.empty:
                continue

            n = upsert_price_data(session, symbol_id, df, interval)
            log.info(f"[{ticker}] Upserted {n} rows")

        cleanup_old_data(session)
        session.commit()
    except Exception as e:
        session.rollback()
        log.error(f"Fetch failed: {e}")
        raise
    finally:
        session.close()


def fetch_single_ticker(ticker: str, interval=DEFAULT_INTERVAL):
    """Fetch data for a single newly-added ticker, then compute indicators + signals."""
    from indicators import run_indicators
    from signals import run_signals

    session = SessionLocal()
    try:
        symbol_id = ensure_symbol(session, ticker)
        params = get_fetch_params(session, symbol_id, interval)
        if params is not None:
            df = fetch_ohlcv(ticker, interval=interval, **params)
            if not df.empty:
                upsert_price_data(session, symbol_id, df, interval)
        session.commit()
    except Exception as e:
        session.rollback()
        log.error(f"Single ticker fetch failed for {ticker}: {e}")
        raise
    finally:
        session.close()

    # Compute indicators and signals for all active symbols
    run_indicators(interval)
    run_signals(interval)


if __name__ == "__main__":
    run_fetch()
