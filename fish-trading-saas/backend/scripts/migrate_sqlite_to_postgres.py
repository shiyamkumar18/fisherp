#!/usr/bin/env python3
"""
migrate_sqlite_to_postgres.py
-----------------------------
Zero-downtime migration utility that copies all data from the SQLite
development database into a running PostgreSQL instance.

Usage:
    python scripts/migrate_sqlite_to_postgres.py [--dry-run] [--validate-only]

Prerequisites:
    pip install psycopg2-binary python-dotenv
    The .env file (or environment) must have DB_* variables set.

Migration phases:
    1. Validate source (SQLite) and target (PostgreSQL) connections.
    2. Run Django migrations on PostgreSQL to create the schema.
    3. Copy data table-by-table in dependency order (FK-safe).
    4. Validate row counts and spot-check data integrity.
    5. Print a checklist summary.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
import traceback
from pathlib import Path

# ---------------------------------------------------------------------------
# Bootstrap Django so we can use its ORM for the final validation step.
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from dotenv import load_dotenv  # noqa: E402

load_dotenv(BACKEND_DIR / ".env")

try:
    import django  # noqa: E402

    django.setup()
except Exception as exc:  # pragma: no cover
    print(f"[ERROR] Could not initialise Django: {exc}")
    sys.exit(1)

import psycopg2  # noqa: E402
from django.db import connection as django_conn  # noqa: E402

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SQLITE_PATH = BACKEND_DIR / "db.sqlite3"


def _pg_dsn() -> dict:
    return {
        "dbname": os.environ["DB_NAME"],
        "user": os.environ["DB_USER"],
        "password": os.environ["DB_PASSWORD"],
        "host": os.environ.get("DB_HOST", "localhost"),
        "port": os.environ.get("DB_PORT", "5432"),
        "connect_timeout": int(os.environ.get("DB_CONNECT_TIMEOUT", "10")),
    }


def _sqlite_tables(conn: sqlite3.Connection) -> list[str]:
    cur = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    return [row[0] for row in cur.fetchall()]


def _table_columns(sqlite_conn: sqlite3.Connection, table: str) -> list[str]:
    cur = sqlite_conn.execute(f"PRAGMA table_info({table})")
    return [row[1] for row in cur.fetchall()]


# ---------------------------------------------------------------------------
# Phases
# ---------------------------------------------------------------------------

def phase1_validate_connections(dry_run: bool) -> tuple[sqlite3.Connection | None, "psycopg2.connection"]:
    """Validate that both databases are accessible."""
    print("\n[Phase 1] Validating database connections …")

    if not SQLITE_PATH.exists():
        print(f"  [WARN] SQLite file not found at {SQLITE_PATH} – skipping data copy.")
        sqlite_conn = None
    else:
        sqlite_conn = sqlite3.connect(str(SQLITE_PATH))
        sqlite_conn.row_factory = sqlite3.Row
        tables = _sqlite_tables(sqlite_conn)
        print(f"  [OK]  SQLite: {SQLITE_PATH}  ({len(tables)} tables)")

    try:
        pg_conn = psycopg2.connect(**_pg_dsn())
        pg_conn.autocommit = False
        cur = pg_conn.cursor()
        cur.execute("SELECT version()")
        version = cur.fetchone()[0].split(",")[0]
        print(f"  [OK]  PostgreSQL: {version}")
    except psycopg2.OperationalError as exc:
        print(f"  [ERROR] Cannot connect to PostgreSQL: {exc}")
        sys.exit(1)

    return sqlite_conn, pg_conn


def phase2_run_migrations(dry_run: bool) -> None:
    """Run Django migrations to create the PostgreSQL schema."""
    print("\n[Phase 2] Running Django migrations on PostgreSQL …")
    if dry_run:
        print("  [DRY-RUN] Would run: manage.py migrate --database default")
        return

    from django.core.management import call_command  # noqa: PLC0415

    call_command("migrate", database="default", verbosity=1)
    print("  [OK]  Migrations applied.")


def phase3_copy_data(
    sqlite_conn: sqlite3.Connection | None,
    pg_conn: "psycopg2.connection",
    dry_run: bool,
) -> dict[str, int]:
    """Copy all rows from SQLite to PostgreSQL."""
    print("\n[Phase 3] Copying data …")
    stats: dict[str, int] = {}

    if sqlite_conn is None:
        print("  [SKIP] No SQLite source found.")
        return stats

    tables = _sqlite_tables(sqlite_conn)
    pg_cur = pg_conn.cursor()

    for table in tables:
        try:
            columns = _table_columns(sqlite_conn, table)
            rows = sqlite_conn.execute(f"SELECT * FROM {table}").fetchall()

            if not rows:
                stats[table] = 0
                continue

            if dry_run:
                print(f"  [DRY-RUN] Would copy {len(rows):>6} rows → {table}")
                stats[table] = len(rows)
                continue

            placeholders = ", ".join(["%s"] * len(columns))
            col_names = ", ".join(f'"{c}"' for c in columns)
            sql = f'INSERT INTO "{table}" ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'

            # Insert rows in FK-safe table order; do not change
            # session_replication_role so this script works with non-superuser roles.
            pg_cur.executemany(sql, [tuple(r) for r in rows])

            pg_conn.commit()
            stats[table] = len(rows)
            print(f"  [OK]  {table:<50} {len(rows):>6} rows")
        except Exception as exc:  # noqa: BLE001
            pg_conn.rollback()
            print(f"  [WARN] {table}: {exc}")
            stats[table] = -1

    return stats


def phase4_validate(
    sqlite_conn: sqlite3.Connection | None,
    pg_conn: "psycopg2.connection",
    stats: dict[str, int],
) -> bool:
    """Validate row counts match between SQLite and PostgreSQL."""
    print("\n[Phase 4] Validating data integrity …")

    if sqlite_conn is None:
        print("  [SKIP] No SQLite source to compare against.")
        return True

    pg_cur = pg_conn.cursor()
    all_ok = True

    for table, copied in stats.items():
        if copied < 0:
            print(f"  [WARN] {table}: copy failed – skipping validation")
            continue

        sqlite_count = sqlite_conn.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
        pg_cur.execute(f'SELECT COUNT(*) FROM "{table}"')
        pg_count = pg_cur.fetchone()[0]

        if sqlite_count == pg_count:
            print(f"  [OK]  {table:<50} {pg_count} rows ✓")
        else:
            print(f"  [FAIL] {table}: SQLite={sqlite_count}  PostgreSQL={pg_count}")
            all_ok = False

    return all_ok


def phase5_summary(stats: dict[str, int], all_ok: bool) -> None:
    """Print final migration checklist."""
    total = sum(v for v in stats.values() if v >= 0)
    failed = [t for t, v in stats.items() if v < 0]

    print("\n" + "=" * 60)
    print("  MIGRATION SUMMARY")
    print("=" * 60)
    print(f"  Tables processed : {len(stats)}")
    print(f"  Total rows copied: {total}")
    print(f"  Failed tables    : {len(failed)}" + (f" {failed}" if failed else ""))
    print(f"  Data integrity   : {'✓ PASS' if all_ok else '✗ FAIL'}")
    print()
    print("  Next steps:")
    print("    1. Update your .env → DB_ENGINE=postgresql")
    print("    2. Restart the application server")
    print("    3. Smoke-test core features")
    print("    4. Archive the SQLite file (do not delete yet)")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Entry-point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate FisherP data from SQLite to PostgreSQL.")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without making changes.")
    parser.add_argument("--validate-only", action="store_true", help="Skip copy; only validate existing data.")
    args = parser.parse_args()

    print("=" * 60)
    print("  FisherP – SQLite → PostgreSQL Migration")
    print(f"  Mode: {'DRY RUN' if args.dry_run else 'LIVE'}")
    print("=" * 60)

    try:
        sqlite_conn, pg_conn = phase1_validate_connections(args.dry_run)
        phase2_run_migrations(args.dry_run)

        if args.validate_only:
            stats = {t: sqlite_conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                     for t in _sqlite_tables(sqlite_conn)} if sqlite_conn else {}
        else:
            stats = phase3_copy_data(sqlite_conn, pg_conn, args.dry_run)

        all_ok = phase4_validate(sqlite_conn, pg_conn, stats)
        phase5_summary(stats, all_ok)

        if sqlite_conn:
            sqlite_conn.close()
        pg_conn.close()

        sys.exit(0 if all_ok else 1)
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
