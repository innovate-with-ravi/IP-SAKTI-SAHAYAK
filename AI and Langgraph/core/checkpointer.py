"""Checkpointer factory for LangGraph state persistence and Human-In-The-Loop interrupts."""
import os
from typing import Any
from langgraph.checkpoint.memory import MemorySaver

# Singleton checkpointer instance
_checkpointer = None

def get_checkpointer() -> Any:
    """
    Returns the checkpointer for LangGraph state persistence.
    If DATABASE_URL or POSTGRES_URL is configured, attempts to connect to Postgres.
    Otherwise, falls back to in-memory MemorySaver for local development and fast testing.
    """
    global _checkpointer
    if _checkpointer is not None:
        return _checkpointer

    db_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or os.getenv("NEON_DATABASE_URL")
    if db_url:
        try:
            from langgraph.checkpoint.postgres import PostgresSaver
            # Use Postgres checkpointer for production
            _checkpointer = PostgresSaver.from_conn_string(db_url)
            _checkpointer.setup()
            return _checkpointer
        except Exception as e:
            print(f"[checkpointer.py]: Could not initialize Postgres checkpointer ({e}). Falling back to MemorySaver.")

    # Default in-memory checkpointer
    _checkpointer = MemorySaver()
    return _checkpointer
