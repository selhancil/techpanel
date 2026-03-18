import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:password@localhost:5432/techanalysis",
)

SEED_TICKERS = ["AAPL", "MSFT", "NVDA", "TSLA", "SPY"]

DEFAULT_PERIOD   = "300d"
DEFAULT_INTERVAL = "1d"

RSI_PERIOD        = 14
SMA_PERIODS       = [20, 50, 200]
EMA_PERIODS       = [9, 21, 50]
SUPERTREND_PERIOD = 10
SUPERTREND_MULT   = 3.0
ICHIMOKU_CONVERSION   = 9
ICHIMOKU_BASE         = 26
ICHIMOKU_SPAN_B       = 52
ICHIMOKU_DISPLACEMENT = 26

RETENTION_DAYS = 300
SIGNAL_LOOKBACK_DAYS = 10
REFRESH_INTERVAL_MINUTES = 60
