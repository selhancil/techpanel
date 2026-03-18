"""
api.py
FastAPI backend for TechPanel — serves data to the React frontend.
Extracts business logic from callbacks.py into REST endpoints.

Run: uvicorn api:app --reload --port 8000
"""

import re
from datetime import datetime, timedelta, timezone

import os
import signal as _signal

from fastapi import BackgroundTasks, Body, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session

from db import SessionLocal
from models import (
    Market,
    MarketGroup,
    PriceData,
    Signal,
    Symbol,
    TechnicalIndicator,
)
from schemas import (
    ChangeRow,
    DashboardMetrics,
    GroupOut,
    MarketOut,
    MarketSentiment,
    MessageResponse,
    SearchResult,
    StatusRow,
    SymbolRow,
    TopGainer,
)

app = FastAPI(title="TechPanel API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Database dependency
# ---------------------------------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Helpers (extracted from callbacks.py)
# ---------------------------------------------------------------------------

def _rsi_label(val: float | None) -> str:
    if val is None:
        return "—"
    if val >= 70:
        return f"{val:.1f}  (Overbought)"
    if val <= 30:
        return f"{val:.1f}  (Oversold)"
    return f"{val:.1f}  (Neutral)"


def _rsi_zone(val: float | None) -> str:
    if val is None:
        return "N/A"
    if val >= 70:
        return "Overbought"
    if val <= 30:
        return "Oversold"
    return "Neutral"


def _days_ago(ts, now: datetime) -> str:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    actual = ts.astimezone(timezone.utc).date()
    delta = (now.date() - actual).days
    date_str = actual.strftime("%b %d")
    if delta == 0:
        return f"Today ({date_str})"
    if delta == 1:
        return f"Yesterday ({date_str})"
    return f"{delta} days ago ({date_str})"


def _apply_wl_filter(query, filter_type: str, filter_id: int | None):
    if not filter_type or filter_type == "all":
        return query
    if filter_type == "market":
        return query.filter(Symbol.market_id == filter_id)
    if filter_type == "group":
        return query.filter(Symbol.groups.any(MarketGroup.id == filter_id))
    if filter_type == "unassigned":
        return query.filter(Symbol.market_id.is_(None))
    if filter_type == "market_no_group":
        return query.filter(Symbol.market_id == filter_id, ~Symbol.groups.any())
    return query


def _shorten_change(change: str) -> str:
    """Convert verbose change text to a short badge-friendly label."""
    mapping = [
        (r"SMA20 crossed above SMA50", "Golden Cross"),
        (r"SMA20 crossed below SMA50", "Death Cross"),
        (r"EMA9 crossed above EMA21", "EMA Bullish Cross"),
        (r"EMA9 crossed below EMA21", "EMA Bearish Cross"),
        (r"Supertrend changed from .* to Bullish", "Supertrend Bullish"),
        (r"Supertrend changed from .* to Bearish", "Supertrend Bearish"),
        (r"Price crossed above SMA200", "Above SMA200"),
        (r"Price crossed below SMA200", "Below SMA200"),
        (r"Ichimoku Cloud: Price moved from .* to Above", "Above Cloud"),
        (r"Ichimoku Cloud: Price moved from .* to Below", "Below Cloud"),
        (r"Ichimoku Cloud: Price moved from .* to Inside", "Inside Cloud"),
        (r"RSI changed from .* to Overbought", "RSI Overbought"),
        (r"RSI changed from .* to Oversold", "RSI Oversold"),
        (r"RSI changed from .* to Neutral", "RSI Neutral"),
    ]
    for pattern, label in mapping:
        if re.search(pattern, change):
            return label
    return change


def _query_current_status(
    db: Session, interval: str, filter_type: str = "all", filter_id: int | None = None
) -> list[StatusRow]:
    query = db.query(Symbol).filter(Symbol.active == True)
    query = _apply_wl_filter(query, filter_type, filter_id)
    symbols = query.order_by(Symbol.ticker).all()
    rows = []
    for sym in symbols:
        price_row = (
            db.query(PriceData)
            .filter_by(symbol_id=sym.id, interval=interval)
            .order_by(PriceData.ts.desc())
            .first()
        )
        ind = (
            db.query(TechnicalIndicator)
            .filter_by(symbol_id=sym.id, interval=interval)
            .order_by(TechnicalIndicator.ts.desc())
            .first()
        )
        if ind is None:
            continue

        rsi = float(ind.rsi_14) if ind.rsi_14 is not None else None
        s20 = float(ind.sma_20) if ind.sma_20 is not None else None
        s50 = float(ind.sma_50) if ind.sma_50 is not None else None
        s200 = float(ind.sma_200) if ind.sma_200 is not None else None
        e9 = float(ind.ema_9) if ind.ema_9 is not None else None
        e21 = float(ind.ema_21) if ind.ema_21 is not None else None
        st = int(ind.supertrend_direction) if ind.supertrend_direction is not None else None
        close = float(price_row.close) if price_row else None

        sma_txt = "—"
        if s20 is not None and s50 is not None:
            sma_txt = "SMA20 Above SMA50" if s20 > s50 else "SMA20 Below SMA50"

        ema_txt = "—"
        if e9 is not None and e21 is not None:
            ema_txt = "EMA9 Above EMA21" if e9 > e21 else "EMA9 Below EMA21"

        sma200_txt = "—"
        if close is not None and s200 is not None:
            sma200_txt = "Above SMA200" if close > s200 else "Below SMA200"

        span_a = float(ind.ichimoku_span_a) if ind.ichimoku_span_a is not None else None
        span_b = float(ind.ichimoku_span_b) if ind.ichimoku_span_b is not None else None
        cloud_txt = "—"
        if close is not None and span_a is not None and span_b is not None:
            cloud_top = max(span_a, span_b)
            cloud_bot = min(span_a, span_b)
            if close > cloud_top:
                cloud_txt = "Above Cloud"
            elif close < cloud_bot:
                cloud_txt = "Below Cloud"
            else:
                cloud_txt = "Inside Cloud"

        rows.append(StatusRow(
            ticker=sym.ticker,
            group=", ".join(g.name for g in sym.groups) or "Unassigned",
            market=sym.market.name if sym.market else "Unassigned",
            close=f"{close:.2f}" if close else "—",
            rsi=_rsi_label(rsi),
            rsi_zone=_rsi_zone(rsi),
            supertrend="Bullish" if st == 1 else ("Bearish" if st == -1 else "—"),
            sma_cross=sma_txt,
            ema_cross=ema_txt,
            price_sma200=sma200_txt,
            ichimoku_cloud=cloud_txt,
            updated=str(ind.ts)[:16],
        ))
    return rows


def _detect_changes(
    db: Session, interval: str, days: int = 5,
    filter_type: str = "all", filter_id: int | None = None,
) -> list[ChangeRow]:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days + 1)
    query = db.query(Symbol).filter_by(active=True)
    query = _apply_wl_filter(query, filter_type, filter_id)
    symbols = query.order_by(Symbol.ticker).all()

    changes: list[dict] = []

    for sym in symbols:
        rows = (
            db.query(TechnicalIndicator, PriceData.close)
            .join(
                PriceData,
                (PriceData.symbol_id == TechnicalIndicator.symbol_id)
                & (PriceData.ts == TechnicalIndicator.ts)
                & (PriceData.interval == TechnicalIndicator.interval),
            )
            .filter(
                TechnicalIndicator.symbol_id == sym.id,
                TechnicalIndicator.interval == interval,
                TechnicalIndicator.ts >= cutoff,
            )
            .order_by(TechnicalIndicator.ts)
            .all()
        )

        if len(rows) < 2:
            continue

        data = []
        for r in rows:
            ind = r.TechnicalIndicator
            data.append({
                "ts": ind.ts,
                "rsi": float(ind.rsi_14) if ind.rsi_14 is not None else None,
                "sma_20": float(ind.sma_20) if ind.sma_20 is not None else None,
                "sma_50": float(ind.sma_50) if ind.sma_50 is not None else None,
                "sma_200": float(ind.sma_200) if ind.sma_200 is not None else None,
                "ema_9": float(ind.ema_9) if ind.ema_9 is not None else None,
                "ema_21": float(ind.ema_21) if ind.ema_21 is not None else None,
                "st_dir": int(ind.supertrend_direction) if ind.supertrend_direction is not None else None,
                "span_a": float(ind.ichimoku_span_a) if ind.ichimoku_span_a is not None else None,
                "span_b": float(ind.ichimoku_span_b) if ind.ichimoku_span_b is not None else None,
                "close": float(r.close) if r.close is not None else None,
            })

        cutoff_date = (now - timedelta(days=days)).date()

        for i in range(1, len(data)):
            curr = data[i]
            prev = data[i - 1]
            ts = curr["ts"]
            ts_utc = ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts.astimezone(timezone.utc)
            if ts_utc.date() < cutoff_date:
                continue
            when = _days_ago(ts, now)

            # RSI zone transitions
            if curr["rsi"] is not None and prev["rsi"] is not None:
                prev_zone = _rsi_zone(prev["rsi"])
                curr_zone = _rsi_zone(curr["rsi"])
                if prev_zone != curr_zone:
                    change_text = (
                        f"RSI changed from {prev_zone} to {curr_zone} "
                        f"(was {prev['rsi']:.1f} → now {curr['rsi']:.1f})"
                    )
                    changes.append({
                        "ticker": sym.ticker, "when": when, "change": change_text,
                        "signal": "SELL" if curr_zone == "Overbought" else ("BUY" if curr_zone == "Oversold" else "—"),
                        "value": f"{curr['rsi']:.1f}", "ts": ts,
                    })

            # SMA20 vs SMA50 crossover
            if all(v is not None for v in [curr["sma_20"], curr["sma_50"], prev["sma_20"], prev["sma_50"]]):
                was_above = prev["sma_20"] > prev["sma_50"]
                now_above = curr["sma_20"] > curr["sma_50"]
                if was_above and not now_above:
                    changes.append({
                        "ticker": sym.ticker, "when": when,
                        "change": "SMA20 crossed below SMA50 (Death Cross)",
                        "signal": "SELL", "value": f"{curr['sma_20']:.2f}", "ts": ts,
                    })
                elif not was_above and now_above:
                    changes.append({
                        "ticker": sym.ticker, "when": when,
                        "change": "SMA20 crossed above SMA50 (Golden Cross)",
                        "signal": "BUY", "value": f"{curr['sma_20']:.2f}", "ts": ts,
                    })

            # EMA9 vs EMA21 crossover
            if all(v is not None for v in [curr["ema_9"], curr["ema_21"], prev["ema_9"], prev["ema_21"]]):
                was_above = prev["ema_9"] > prev["ema_21"]
                now_above = curr["ema_9"] > curr["ema_21"]
                if was_above and not now_above:
                    changes.append({
                        "ticker": sym.ticker, "when": when,
                        "change": "EMA9 crossed below EMA21",
                        "signal": "SELL", "value": f"{curr['ema_9']:.2f}", "ts": ts,
                    })
                elif not was_above and now_above:
                    changes.append({
                        "ticker": sym.ticker, "when": when,
                        "change": "EMA9 crossed above EMA21",
                        "signal": "BUY", "value": f"{curr['ema_9']:.2f}", "ts": ts,
                    })

            # Supertrend direction flip
            if curr["st_dir"] is not None and prev["st_dir"] is not None:
                if prev["st_dir"] != curr["st_dir"]:
                    from_st = "Bearish" if prev["st_dir"] == -1 else "Bullish"
                    to_st = "Bullish" if curr["st_dir"] == 1 else "Bearish"
                    changes.append({
                        "ticker": sym.ticker, "when": when,
                        "change": f"Supertrend changed from {from_st} to {to_st}",
                        "signal": "BUY" if curr["st_dir"] == 1 else "SELL",
                        "value": f"{curr['close']:.2f}" if curr["close"] else "—",
                        "ts": ts,
                    })

            # Price vs SMA200 crossover
            if all(v is not None for v in [curr["close"], curr["sma_200"], prev["close"], prev["sma_200"]]):
                was_above = prev["close"] > prev["sma_200"]
                now_above = curr["close"] > curr["sma_200"]
                if was_above and not now_above:
                    changes.append({
                        "ticker": sym.ticker, "when": when,
                        "change": f"Price crossed below SMA200 (close: {curr['close']:.2f}, SMA200: {curr['sma_200']:.2f})",
                        "signal": "SELL", "value": f"{curr['close']:.2f}", "ts": ts,
                    })
                elif not was_above and now_above:
                    changes.append({
                        "ticker": sym.ticker, "when": when,
                        "change": f"Price crossed above SMA200 (close: {curr['close']:.2f}, SMA200: {curr['sma_200']:.2f})",
                        "signal": "BUY", "value": f"{curr['close']:.2f}", "ts": ts,
                    })

            # Ichimoku Cloud position change
            if all(v is not None for v in [
                curr["close"], curr["span_a"], curr["span_b"],
                prev["close"], prev["span_a"], prev["span_b"],
            ]):
                def _cloud_pos(close, sa, sb):
                    top, bot = max(sa, sb), min(sa, sb)
                    if close > top:
                        return "Above"
                    elif close < bot:
                        return "Below"
                    return "Inside"

                prev_pos = _cloud_pos(prev["close"], prev["span_a"], prev["span_b"])
                curr_pos = _cloud_pos(curr["close"], curr["span_a"], curr["span_b"])
                if prev_pos != curr_pos:
                    if curr_pos == "Above":
                        signal = "BUY"
                    elif curr_pos == "Below":
                        signal = "SELL"
                    else:
                        signal = "BUY" if prev_pos == "Below" else "SELL"
                    changes.append({
                        "ticker": sym.ticker, "when": when,
                        "change": f"Ichimoku Cloud: Price moved from {prev_pos} to {curr_pos}",
                        "signal": signal, "value": f"{curr['close']:.2f}", "ts": ts,
                    })

    changes.sort(key=lambda x: x["ts"], reverse=True)

    return [
        ChangeRow(
            ticker=c["ticker"],
            when=c["when"],
            change=c["change"],
            change_short=_shorten_change(c["change"]),
            signal=c["signal"],
            value=c["value"],
        )
        for c in changes
    ]


# ---------------------------------------------------------------------------
# Dashboard endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/dashboard/status", response_model=list[StatusRow])
def get_dashboard_status(
    interval: str = Query("1d"),
    filter_type: str = Query("all"),
    filter_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return _query_current_status(db, interval, filter_type, filter_id)


@app.get("/api/v1/dashboard/changes", response_model=list[ChangeRow])
def get_dashboard_changes(
    interval: str = Query("1d"),
    days: int = Query(5),
    filter_type: str = Query("all"),
    filter_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    return _detect_changes(db, interval, days, filter_type, filter_id)


@app.get("/api/v1/dashboard/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(
    filter_type: str = Query("all"),
    filter_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    total_assets = db.query(Symbol).filter_by(active=True).count()

    # Daily new buy signals
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    buy_count = (
        db.query(Signal)
        .filter(Signal.signal == "BUY", Signal.created_at >= today_start)
        .count()
    )

    # Top gainer: compare latest two price rows per active symbol
    top_gainer = None
    best_pct = -999.0
    active_symbols = db.query(Symbol).filter_by(active=True).all()
    for sym in active_symbols:
        prices = (
            db.query(PriceData)
            .filter_by(symbol_id=sym.id, interval="1d")
            .order_by(PriceData.ts.desc())
            .limit(2)
            .all()
        )
        if len(prices) == 2 and prices[1].close and prices[0].close:
            prev_close = float(prices[1].close)
            curr_close = float(prices[0].close)
            if prev_close > 0:
                pct = ((curr_close - prev_close) / prev_close) * 100
                if pct > best_pct:
                    best_pct = pct
                    top_gainer = TopGainer(ticker=sym.ticker, change_pct=round(pct, 2))

    # Market sentiment: ratio of bullish supertrend across active symbols
    bullish = 0
    bearish = 0
    for sym in active_symbols:
        ind = (
            db.query(TechnicalIndicator)
            .filter_by(symbol_id=sym.id, interval="1d")
            .order_by(TechnicalIndicator.ts.desc())
            .first()
        )
        if ind and ind.supertrend_direction is not None:
            if int(ind.supertrend_direction) == 1:
                bullish += 1
            else:
                bearish += 1
    total_dir = bullish + bearish
    if total_dir > 0:
        bullish_pct = round((bullish / total_dir) * 100, 1)
        bearish_pct = round(100 - bullish_pct, 1)
        label = "Bullish" if bullish_pct >= 60 else ("Bearish" if bearish_pct >= 60 else "Neutral")
    else:
        bullish_pct = 0.0
        bearish_pct = 0.0
        label = "N/A"

    # Count recent changes
    changes = _detect_changes(db, "1d", 5, filter_type, filter_id)

    return DashboardMetrics(
        daily_new_buy_signals=buy_count,
        top_gainer=top_gainer,
        market_sentiment=MarketSentiment(
            label=label, bullish_pct=bullish_pct, bearish_pct=bearish_pct,
        ),
        total_assets=total_assets,
        recent_changes=len(changes),
    )


# ---------------------------------------------------------------------------
# Symbols endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/symbols", response_model=list[SymbolRow])
def get_symbols(db: Session = Depends(get_db)):
    symbols = db.query(Symbol).order_by(Symbol.ticker).all()
    return [
        SymbolRow(
            ticker=s.ticker,
            name=s.name or "—",
            exchange=s.exchange or "—",
            market=s.market.name if s.market else "—",
            market_id=s.market_id,
            group=", ".join(g.name for g in s.groups) or "—",
            group_ids=[g.id for g in s.groups],
            status="Active" if s.active else "Inactive",
            active=s.active,
            added=s.created_at.strftime("%Y-%m-%d") if s.created_at else "—",
        )
        for s in symbols
    ]


@app.get("/api/v1/symbols/search", response_model=list[SearchResult])
def search_symbols(q: str = Query("", min_length=1), db: Session = Depends(get_db)):
    results = (
        db.query(Symbol)
        .filter(
            Symbol.active == True,
            (Symbol.ticker.ilike(f"%{q}%")) | (Symbol.name.ilike(f"%{q}%")),
        )
        .order_by(Symbol.ticker)
        .limit(10)
        .all()
    )
    return [
        SearchResult(ticker=s.ticker, name=s.name or "", exchange=s.exchange or "")
        for s in results
    ]


@app.post("/api/v1/symbols", response_model=MessageResponse)
def add_symbol(ticker: str = Query(...), db: Session = Depends(get_db)):
    ticker = ticker.strip().upper()
    if not ticker:
        raise HTTPException(400, "Ticker is required")

    existing = db.query(Symbol).filter_by(ticker=ticker).first()
    if existing:
        if not existing.active:
            existing.active = True
            existing.updated_at = datetime.now(timezone.utc)
            db.commit()
            return MessageResponse(message=f"{ticker} reactivated.", success=True)
        return MessageResponse(message=f"{ticker} already exists.", success=False)

    import yfinance as yf

    try:
        info = yf.Ticker(ticker).info or {}
    except Exception:
        info = {}
    if not info.get("regularMarketPrice"):
        raise HTTPException(400, f"Invalid ticker: {ticker}")

    try:
        from fetch import fetch_single_ticker
        fetch_single_ticker(ticker)
    except Exception as e:
        raise HTTPException(500, f"Error fetching {ticker}: {e}")

    return MessageResponse(message=f"Added {ticker} successfully.", success=True)


@app.delete("/api/v1/symbols/{ticker}", response_model=MessageResponse)
def remove_symbol(ticker: str, db: Session = Depends(get_db)):
    sym = db.query(Symbol).filter_by(ticker=ticker.upper()).first()
    if not sym:
        raise HTTPException(404, f"Symbol {ticker} not found")
    db.delete(sym)
    db.commit()
    return MessageResponse(message=f"{ticker.upper()} removed.", success=True)


@app.patch("/api/v1/symbols/{ticker}/toggle", response_model=MessageResponse)
def toggle_symbol(ticker: str, db: Session = Depends(get_db)):
    sym = db.query(Symbol).filter_by(ticker=ticker.upper()).first()
    if not sym:
        raise HTTPException(404, f"Symbol {ticker} not found")
    sym.active = not sym.active
    sym.updated_at = datetime.now(timezone.utc)
    db.commit()
    status = "activated" if sym.active else "deactivated"
    return MessageResponse(message=f"{ticker.upper()} {status}.", success=True)


@app.patch("/api/v1/symbols/{ticker}/assign", response_model=MessageResponse)
def assign_symbol(
    ticker: str,
    market_id: int | None = Query(None),
    group_ids: list[int] = Query(default=[]),
    db: Session = Depends(get_db),
):
    sym = db.query(Symbol).filter_by(ticker=ticker.upper()).first()
    if not sym:
        raise HTTPException(404, f"Symbol {ticker} not found")
    sym.market_id = market_id
    sym.groups = [db.query(MarketGroup).get(gid) for gid in group_ids if db.query(MarketGroup).get(gid)]
    sym.updated_at = datetime.now(timezone.utc)
    db.commit()
    return MessageResponse(message=f"{ticker.upper()} assignment updated.", success=True)


# ---------------------------------------------------------------------------
# Markets endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/markets", response_model=list[MarketOut])
def get_markets(db: Session = Depends(get_db)):
    markets = db.query(Market).order_by(Market.display_order, Market.name).all()
    result = []
    for m in markets:
        m_count = db.query(func.count(Symbol.id)).filter(
            Symbol.market_id == m.id, Symbol.active == True
        ).scalar() or 0
        groups = []
        for g in m.groups:
            g_count = db.query(func.count(Symbol.id)).filter(
                Symbol.groups.any(MarketGroup.id == g.id), Symbol.active == True
            ).scalar() or 0
            groups.append(GroupOut(id=g.id, name=g.name, symbol_count=g_count))
        result.append(MarketOut(
            id=m.id, name=m.name, display_order=m.display_order,
            symbol_count=m_count, groups=groups,
        ))
    return result


@app.post("/api/v1/markets", response_model=MessageResponse)
def create_market(name: str = Query(...), db: Session = Depends(get_db)):
    name = name.strip()
    if not name:
        raise HTTPException(400, "Market name is required")
    if db.query(Market).filter_by(name=name).first():
        return MessageResponse(message=f"'{name}' already exists.", success=False)
    max_order = db.query(func.max(Market.display_order)).scalar() or 0
    db.add(Market(name=name, display_order=max_order + 1))
    db.commit()
    return MessageResponse(message=f"'{name}' created.", success=True)


@app.delete("/api/v1/markets/{market_id}", response_model=MessageResponse)
def delete_market(market_id: int, db: Session = Depends(get_db)):
    m = db.query(Market).get(market_id)
    if not m:
        raise HTTPException(404, "Market not found")
    name = m.name
    db.delete(m)
    db.commit()
    return MessageResponse(message=f"'{name}' deleted.", success=True)


# ---------------------------------------------------------------------------
# Groups endpoints
# ---------------------------------------------------------------------------

@app.post("/api/v1/groups", response_model=MessageResponse)
def create_group(
    market_id: int = Query(...),
    name: str = Query(...),
    db: Session = Depends(get_db),
):
    name = name.strip()
    if not name:
        raise HTTPException(400, "Group name is required")
    if db.query(MarketGroup).filter_by(market_id=market_id, name=name).first():
        return MessageResponse(message=f"'{name}' already exists.", success=False)
    max_order = (
        db.query(func.max(MarketGroup.display_order))
        .filter_by(market_id=market_id)
        .scalar()
        or 0
    )
    db.add(MarketGroup(market_id=market_id, name=name, display_order=max_order + 1))
    db.commit()
    return MessageResponse(message=f"'{name}' created.", success=True)


@app.patch("/api/v1/groups/reorder", response_model=MessageResponse)
def reorder_groups(
    group_ids: list[int] = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    """Set display_order for groups based on the order of group_ids."""
    for idx, gid in enumerate(group_ids):
        db.query(MarketGroup).filter_by(id=gid).update({"display_order": idx})
    db.commit()
    return MessageResponse(message="Group order updated.", success=True)


@app.delete("/api/v1/groups/{group_id}", response_model=MessageResponse)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    g = db.query(MarketGroup).get(group_id)
    if not g:
        raise HTTPException(404, "Group not found")
    name = g.name
    db.delete(g)
    db.commit()
    return MessageResponse(message=f"'{name}' deleted.", success=True)


# ---------------------------------------------------------------------------
# Sync endpoint
# ---------------------------------------------------------------------------

@app.post("/api/v1/sync", response_model=MessageResponse)
def sync_data(background_tasks: BackgroundTasks):
    from scheduler import full_pipeline

    background_tasks.add_task(full_pipeline)
    return MessageResponse(
        message="Sync started in background.", success=True
    )


@app.post("/api/v1/shutdown", response_model=MessageResponse)
def shutdown_server():
    """Backend ve frontend sunucularını kapatır."""
    import subprocess

    def _kill_port(port: int):
        result = subprocess.run(
            ["lsof", "-ti", f":{port}"], capture_output=True, text=True
        )
        for pid in result.stdout.strip().split("\n"):
            if pid.strip():
                try:
                    os.kill(int(pid.strip()), _signal.SIGKILL)
                except ProcessLookupError:
                    pass

    # Önce frontend'i kapat (port 5173)
    _kill_port(5173)
    # Sonra backend'i kapat
    os.kill(os.getpid(), _signal.SIGTERM)
    return MessageResponse(message="Shutting down...", success=True)
