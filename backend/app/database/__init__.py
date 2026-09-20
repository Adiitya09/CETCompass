"""
Database package exposing SQLAlchemy engine, session maker, Base model, and dependency.
"""
from backend.app.database.session import engine, SessionLocal, Base, get_db

__all__ = ["engine", "SessionLocal", "Base", "get_db"]
