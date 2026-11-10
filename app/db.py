"""Thin SQLite helpers built on top of Flask's application context."""

import sqlite3

from flask import current_app, g


def get_db() -> sqlite3.Connection:
    """Return the request-scoped database connection."""
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_exception=None) -> None:
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def query(sql: str, args=()) -> list[sqlite3.Row]:
    return get_db().execute(sql, args).fetchall()


def query_one(sql: str, args=()) -> sqlite3.Row | None:
    return get_db().execute(sql, args).fetchone()


def execute(sql: str, args=()) -> sqlite3.Cursor:
    connection = get_db()
    cursor = connection.execute(sql, args)
    connection.commit()
    return cursor


def insert(table: str, data: dict) -> int:
    columns = ", ".join(data)
    placeholders = ", ".join("?" for _ in data)
    sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
    return execute(sql, list(data.values())).lastrowid


def update(table: str, row_id: int, data: dict) -> None:
    assignments = ", ".join(f"{column} = ?" for column in data)
    execute(f"UPDATE {table} SET {assignments} WHERE id = ?", [*data.values(), row_id])


def delete(table: str, row_id: int) -> None:
    execute(f"DELETE FROM {table} WHERE id = ?", (row_id,))


def init_db(seed: bool = True) -> None:
    """Create the schema if needed and optionally load demo data."""
    connection = get_db()
    with current_app.open_resource("schema.sql") as handle:
        connection.executescript(handle.read().decode("utf-8"))

    if seed and connection.execute("SELECT COUNT(*) AS total FROM products").fetchone()["total"] == 0:
        with current_app.open_resource("seed.sql") as handle:
            connection.executescript(handle.read().decode("utf-8"))

    connection.commit()


def init_app(app) -> None:
    app.teardown_appcontext(close_db)
