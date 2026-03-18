"""
One-time migration: add markets, market_groups tables
and market_id / group_id columns to symbols.
"""
from db import engine
from sqlalchemy import text

def migrate():
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS markets (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                display_order INTEGER DEFAULT 0
            );
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS market_groups (
                id SERIAL PRIMARY KEY,
                market_id INTEGER NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                display_order INTEGER DEFAULT 0,
                UNIQUE(market_id, name)
            );
        """))
        conn.execute(text("""
            ALTER TABLE symbols ADD COLUMN IF NOT EXISTS market_id INTEGER
                REFERENCES markets(id) ON DELETE SET NULL;
        """))
        conn.execute(text("""
            ALTER TABLE symbols ADD COLUMN IF NOT EXISTS group_id INTEGER
                REFERENCES market_groups(id) ON DELETE SET NULL;
        """))
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
