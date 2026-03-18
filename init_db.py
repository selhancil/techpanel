"""
init_db.py
Run once to create all database tables.
Safe to re-run — uses CREATE TABLE IF NOT EXISTS via SQLAlchemy.

Usage:
    python init_db.py
"""

from db import engine, Base
import models  # noqa: F401 — registers all ORM classes with Base

if __name__ == "__main__":
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Done.")
