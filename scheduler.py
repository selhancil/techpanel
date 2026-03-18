"""
scheduler.py
Runs the full pipeline (fetch → indicators → signals) on a periodic schedule.

Usage:
    python scheduler.py
"""

import logging

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import REFRESH_INTERVAL_MINUTES
from fetch import run_fetch
from indicators import run_indicators
from signals import run_signals

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)


def full_pipeline():
    """Execute fetch → indicators → signals in sequence."""
    log.info("=== Pipeline start: fetch ===")
    run_fetch()
    log.info("=== Pipeline: indicators ===")
    run_indicators()
    log.info("=== Pipeline: signals ===")
    run_signals()
    log.info("=== Pipeline complete ===")


if __name__ == "__main__":
    scheduler = BlockingScheduler()
    scheduler.add_job(
        full_pipeline,
        trigger=IntervalTrigger(minutes=REFRESH_INTERVAL_MINUTES),
        id="full_pipeline",
        name="Fetch + Indicators + Signals",
        replace_existing=True,
        misfire_grace_time=300,
    )
    log.info(f"Scheduler started — running every {REFRESH_INTERVAL_MINUTES} minutes.")
    # Run immediately on startup so the DB is populated before the dashboard loads
    full_pipeline()
    scheduler.start()
