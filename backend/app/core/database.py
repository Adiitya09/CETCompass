"""
Database configuration and session entrypoint.
Points to backend.app.database.session.
"""
from backend.app.database.session import engine, SessionLocal, Base, get_db

__all__ = ["engine", "SessionLocal", "Base", "get_db"]
