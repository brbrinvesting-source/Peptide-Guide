"""SQLite helpers shared by every stage of the pipeline."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def get_connection(db_path: str | Path) -> sqlite3.Connection:
    db_path = PIPELINE_ROOT / db_path if not Path(db_path).is_absolute() else Path(db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_PATH.read_text())
    conn.commit()


def insert_raw_signal(
    conn: sqlite3.Connection,
    source: str,
    source_id: str,
    title: str | None,
    body: str | None,
    url: str | None,
    metadata: dict | None = None,
) -> int | None:
    """Insert a raw signal, skipping it if (source, source_id) was already collected.

    Returns the new row id, or None if it was a duplicate.
    """
    cur = conn.execute(
        """
        INSERT OR IGNORE INTO raw_signals (source, source_id, title, body, url, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (source, source_id, title, body, url, json.dumps(metadata or {})),
    )
    conn.commit()
    return cur.lastrowid if cur.rowcount else None


def fetch_unscored_signals(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT rs.* FROM raw_signals rs
        LEFT JOIN ideas i ON i.raw_signal_id = rs.id
        WHERE i.id IS NULL
        ORDER BY rs.collected_at ASC
        """
    ).fetchall()


def insert_idea(conn: sqlite3.Connection, raw_signal_id: int, idea: dict) -> int:
    cur = conn.execute(
        """
        INSERT INTO ideas (
            raw_signal_id, title, description, category, pain_point, target_user,
            market_size_score, competition_score, feasibility_score, overall_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            raw_signal_id,
            idea["title"],
            idea["description"],
            idea.get("category"),
            idea.get("pain_point"),
            idea.get("target_user"),
            idea.get("market_size_score"),
            idea.get("competition_score"),
            idea.get("feasibility_score"),
            idea["overall_score"],
        ),
    )
    conn.commit()
    return cur.lastrowid


def fetch_top_ideas(conn: sqlite3.Connection, min_score: float, limit: int, status: str = "new") -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT * FROM ideas
        WHERE status = ? AND overall_score >= ?
        ORDER BY overall_score DESC
        LIMIT ?
        """,
        (status, min_score, limit),
    ).fetchall()


def mark_ideas_notified(conn: sqlite3.Connection, idea_ids: list[int]) -> None:
    if not idea_ids:
        return
    placeholders = ",".join("?" * len(idea_ids))
    conn.execute(f"UPDATE ideas SET status = 'notified' WHERE id IN ({placeholders})", idea_ids)
    conn.commit()
