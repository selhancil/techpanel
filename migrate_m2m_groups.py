"""
migrate_m2m_groups.py
Migrate from single group_id FK to many-to-many symbol_groups table.

Usage:
    python migrate_m2m_groups.py
"""

from sqlalchemy import text
from db import engine


def migrate():
    with engine.begin() as conn:
        # 1. Create junction table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS symbol_groups (
                symbol_id INTEGER NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
                group_id  INTEGER NOT NULL REFERENCES market_groups(id) ON DELETE CASCADE,
                PRIMARY KEY (symbol_id, group_id)
            );
        """))
        print("Created symbol_groups table.")

        # 2. Copy existing group assignments
        result = conn.execute(text("""
            INSERT INTO symbol_groups (symbol_id, group_id)
            SELECT id, group_id FROM symbols WHERE group_id IS NOT NULL
            ON CONFLICT DO NOTHING;
        """))
        print(f"Migrated {result.rowcount} existing group assignments.")

        # 3. Drop old column
        conn.execute(text("""
            ALTER TABLE symbols DROP COLUMN IF EXISTS group_id;
        """))
        print("Dropped group_id column from symbols.")

    print("Migration complete.")


if __name__ == "__main__":
    migrate()
