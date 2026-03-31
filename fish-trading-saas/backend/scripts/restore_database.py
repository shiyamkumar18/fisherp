#!/usr/bin/env python3
"""
restore_database.py
-------------------
Restore a FisherP PostgreSQL database from a compressed pg_dump backup.

Usage:
    python scripts/restore_database.py --backup /path/to/backup.sql.gz [--drop-existing]

WARNING: --drop-existing will DROP and recreate the target database.
         Use with extreme caution in production.
"""

from __future__ import annotations

import argparse
import gzip
import logging
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
# Bootstrap .env loading
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent
_dotenv_path = BACKEND_DIR / ".env"
if _dotenv_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_dotenv_path)
    except ImportError:
        pass

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
log = logging.getLogger("fisherp.restore")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pg_env() -> dict[str, str]:
    env = os.environ.copy()
    env["PGPASSWORD"] = os.environ.get("DB_PASSWORD", "")
    return env


def _psql_base_args() -> list[str]:
    return [
        "--host", os.environ.get("DB_HOST", "localhost"),
        "--port", os.environ.get("DB_PORT", "5432"),
        "--username", os.environ.get("DB_USER", "postgres"),
        "--no-password",
    ]


def decompress_backup(backup_path: Path, tmp_dir: Path) -> Path:
    """Decompress a .sql.gz backup to a temporary .sql file."""
    log.info("Decompressing %s …", backup_path.name)
    sql_path = tmp_dir / backup_path.stem  # strips .gz → .sql

    with gzip.open(backup_path, "rb") as gz_in, open(sql_path, "wb") as sql_out:
        shutil.copyfileobj(gz_in, sql_out)

    size_mb = sql_path.stat().st_size / (1024 * 1024)
    log.info("Decompressed SQL: %.2f MB", size_mb)
    return sql_path


def drop_and_recreate_database(db_name: str) -> None:
    """Drop the target database and recreate it (connects to 'postgres' maintenance DB)."""
    import re  # noqa: PLC0415

    # Validate db_name to prevent SQL injection: allow only alphanumeric, underscore, hyphen.
    if not re.match(r'^[A-Za-z0-9_\-]+$', db_name):
        raise ValueError(f"Invalid database name '{db_name}'. Only alphanumeric, underscore, and hyphen are allowed.")

    log.warning("Dropping database '%s' …", db_name)

    for sql in (
        f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db_name}' AND pid <> pg_backend_pid();",
        f"DROP DATABASE IF EXISTS \"{db_name}\";",
        f"CREATE DATABASE \"{db_name}\";",
    ):
        result = subprocess.run(
            ["psql"] + _psql_base_args() + ["--dbname", "postgres", "--command", sql],
            env=_pg_env(),
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise RuntimeError(f"Failed to execute: {sql}\n{result.stderr}")

    log.info("Database '%s' recreated.", db_name)


def restore_from_sql(sql_path: Path, db_name: str) -> None:
    """Restore the database from a plain SQL dump file."""
    log.info("Restoring into database '%s' …", db_name)

    cmd = ["psql"] + _psql_base_args() + [
        "--dbname", db_name,
        "--file", str(sql_path),
        "--echo-errors",
    ]

    result = subprocess.run(cmd, env=_pg_env(), capture_output=True, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"psql restore failed (exit {result.returncode}):\n{result.stderr}")

    log.info("Restore complete.")


# ---------------------------------------------------------------------------
# Entry-point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Restore FisherP PostgreSQL from backup.")
    parser.add_argument("--backup", type=Path, required=True, help="Path to the .sql.gz backup file.")
    parser.add_argument(
        "--drop-existing",
        action="store_true",
        help="Drop and recreate the target database before restoring (DESTRUCTIVE).",
    )
    args = parser.parse_args()

    if not args.backup.exists():
        log.error("Backup file not found: %s", args.backup)
        sys.exit(1)

    for tool in ("psql",):
        if shutil.which(tool) is None:
            log.error("'%s' not found on PATH. Install postgresql-client.", tool)
            sys.exit(1)

    db_name = os.environ.get("DB_NAME", "fisherp_prod")

    if args.drop_existing:
        confirm = input(
            f"\n⚠️  This will DROP the database '{db_name}' and restore from backup.\n"
            "Type the database name to confirm: "
        ).strip()
        if confirm != db_name:
            log.error("Confirmation did not match. Aborting.")
            sys.exit(1)

    with tempfile.TemporaryDirectory() as tmp_dir:
        try:
            sql_path = decompress_backup(args.backup, Path(tmp_dir))

            if args.drop_existing:
                drop_and_recreate_database(db_name)

            restore_from_sql(sql_path, db_name)
            log.info("Restore job finished successfully.")
            sys.exit(0)
        except Exception as exc:
            log.error("Restore job FAILED: %s", exc)
            sys.exit(1)


if __name__ == "__main__":
    main()
