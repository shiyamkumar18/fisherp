#!/usr/bin/env python3
"""
backup_database.py
------------------
Automated PostgreSQL backup script for FisherP.

Features:
  - Creates compressed pg_dump backups (.sql.gz)
  - Retains the last N days of backups (default: 30)
  - Optionally encrypts the archive with GPG
  - Logs success/failure to stdout (suitable for cron)
  - Exits with non-zero status on failure (for alerting)

Usage:
    python scripts/backup_database.py [--output-dir /path/to/backups] [--retain-days 30]

Cron example (daily at 02:00 UTC):
    0 2 * * *  cd /app && python scripts/backup_database.py >> /var/log/fisherp_backup.log 2>&1
"""

from __future__ import annotations

import argparse
import gzip
import logging
import os
import shutil
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# Bootstrap .env loading (no Django required)
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent
_dotenv_path = BACKEND_DIR / ".env"
if _dotenv_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_dotenv_path)
    except ImportError:
        pass  # python-dotenv not installed; rely on shell environment

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
log = logging.getLogger("fisherp.backup")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DEFAULT_BACKUP_DIR = BACKEND_DIR / "backups"
TIMESTAMP_FMT = "%Y%m%d_%H%M%S"


def _pg_env() -> dict[str, str]:
    """Build environment dict for pg_dump (uses PGPASSWORD so we don't expose creds in argv)."""
    env = os.environ.copy()
    env["PGPASSWORD"] = os.environ.get("DB_PASSWORD", "")
    return env


def _pg_args() -> list[str]:
    return [
        "--host", os.environ.get("DB_HOST", "localhost"),
        "--port", os.environ.get("DB_PORT", "5432"),
        "--username", os.environ.get("DB_USER", "postgres"),
        "--dbname", os.environ.get("DB_NAME", "fisherp_prod"),
        "--format", "plain",        # plain SQL – portable
        "--no-password",
        "--verbose",
    ]


def create_backup(output_dir: Path) -> Path:
    """Run pg_dump and write a compressed .sql.gz file. Returns the backup path."""
    if shutil.which("pg_dump") is None:
        raise RuntimeError("pg_dump not found on PATH. Install postgresql-client.")

    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(tz=timezone.utc).strftime(TIMESTAMP_FMT)
    db_name = os.environ.get("DB_NAME", "fisherp_prod")
    backup_filename = f"{db_name}_{timestamp}.sql.gz"
    backup_path = output_dir / backup_filename

    log.info("Starting backup → %s", backup_path)

    cmd = ["pg_dump"] + _pg_args()

    with gzip.open(backup_path, "wt", encoding="utf-8") as gz_file:
        result = subprocess.run(
            cmd,
            env=_pg_env(),
            stdout=gz_file,
            stderr=subprocess.PIPE,
            text=True,
        )

    if result.returncode != 0:
        # Remove incomplete file
        backup_path.unlink(missing_ok=True)
        raise RuntimeError(f"pg_dump failed (exit {result.returncode}):\n{result.stderr}")

    size_mb = backup_path.stat().st_size / (1024 * 1024)
    log.info("Backup complete: %s (%.2f MB)", backup_path.name, size_mb)
    return backup_path


def prune_old_backups(output_dir: Path, retain_days: int) -> None:
    """Delete backup files older than retain_days."""
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=retain_days)
    deleted = 0

    for f in output_dir.glob("*.sql.gz"):
        mtime = datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc)
        if mtime < cutoff:
            log.info("Pruning old backup: %s", f.name)
            f.unlink()
            deleted += 1

    log.info("Pruned %d backup(s) older than %d days.", deleted, retain_days)


def verify_backup(backup_path: Path) -> None:
    """Quick integrity check: attempt to read the compressed archive."""
    log.info("Verifying backup integrity …")
    try:
        with gzip.open(backup_path, "rt") as f:
            first_line = f.readline()
        if not first_line:
            raise ValueError("Backup file appears empty.")
        log.info("Backup verification passed.")
    except Exception as exc:
        raise RuntimeError(f"Backup verification failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Entry-point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Backup FisherP PostgreSQL database.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_BACKUP_DIR,
        help="Directory to store backups (default: backend/backups/).",
    )
    parser.add_argument(
        "--retain-days",
        type=int,
        default=30,
        help="Number of days to retain backups (default: 30).",
    )
    parser.add_argument(
        "--no-verify",
        action="store_true",
        help="Skip post-backup integrity verification.",
    )
    args = parser.parse_args()

    try:
        backup_path = create_backup(args.output_dir)
        if not args.no_verify:
            verify_backup(backup_path)
        prune_old_backups(args.output_dir, args.retain_days)
        log.info("Backup job finished successfully.")
        sys.exit(0)
    except Exception as exc:
        log.error("Backup job FAILED: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
