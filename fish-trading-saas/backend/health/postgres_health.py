"""
postgres_health.py
------------------
PostgreSQL health-check utilities for FisherP.

Exposes two checks used by the /health/postgres/ endpoint:
  - connection_check()  → verifies the DB is reachable
  - replication_check() → reports streaming-replication lag (primary only)

Designed to be import-safe (no side-effects at module level) and usable
both from the Django view layer and from CLI scripts.
"""

from __future__ import annotations

import logging
import time
from typing import Any

log = logging.getLogger("fisherp.health.postgres")


# ---------------------------------------------------------------------------
# Connection check
# ---------------------------------------------------------------------------

def connection_check() -> dict[str, Any]:
    """
    Verify the default Django DB connection is operational.

    Returns a dict with:
        status   : "ok" | "error"
        latency_ms: round-trip latency in milliseconds (or None on error)
        detail   : human-readable message
    """
    try:
        from django.db import connection  # noqa: PLC0415

        start = time.monotonic()
        with connection.cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        latency_ms = round((time.monotonic() - start) * 1000, 2)

        return {
            "status": "ok",
            "latency_ms": latency_ms,
            "detail": "PostgreSQL is reachable.",
        }
    except Exception as exc:  # noqa: BLE001
        log.error("PostgreSQL connection check failed: %s", exc)
        return {
            "status": "error",
            "latency_ms": None,
            "detail": str(exc),
        }


# ---------------------------------------------------------------------------
# Replication lag check (primary-side)
# ---------------------------------------------------------------------------

def replication_check() -> dict[str, Any]:
    """
    Query pg_stat_replication to detect connected standbys and their lag.

    Returns a dict with:
        status       : "ok" | "warning" | "error" | "not_applicable"
        standbys     : list of {application_name, state, lag_bytes, lag_seconds}
        detail       : human-readable message

    "not_applicable" is returned when the instance is a replica (no
    pg_stat_replication data) or when not connected to PostgreSQL.
    """
    try:
        from django.db import connection  # noqa: PLC0415

        if connection.vendor != "postgresql":
            return {
                "status": "not_applicable",
                "standbys": [],
                "detail": f"Database backend is '{connection.vendor}', not PostgreSQL.",
            }

        sql = """
            SELECT
                application_name,
                state,
                COALESCE(write_lag, '0'::interval) AS write_lag,
                COALESCE(pg_wal_lsn_diff(sent_lsn, replay_lsn), 0) AS lag_bytes
            FROM pg_stat_replication
            ORDER BY application_name;
        """
        with connection.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

        if not rows:
            return {
                "status": "not_applicable",
                "standbys": [],
                "detail": "No streaming replication standbys detected.",
            }

        standbys = []
        has_warning = False
        for app_name, state, write_lag, lag_bytes in rows:
            lag_seconds = write_lag.total_seconds() if write_lag else 0
            if lag_seconds > 30 or lag_bytes > 50 * 1024 * 1024:  # 30s or 50 MB
                has_warning = True
            standbys.append({
                "application_name": app_name,
                "state": state,
                "lag_bytes": lag_bytes,
                "lag_seconds": round(lag_seconds, 2),
            })

        return {
            "status": "warning" if has_warning else "ok",
            "standbys": standbys,
            "detail": (
                "Replication lag exceeds threshold on one or more standbys."
                if has_warning
                else f"{len(standbys)} standby(s) in sync."
            ),
        }
    except Exception as exc:  # noqa: BLE001
        log.error("Replication check failed: %s", exc)
        return {
            "status": "error",
            "standbys": [],
            "detail": str(exc),
        }


# ---------------------------------------------------------------------------
# Combined health summary
# ---------------------------------------------------------------------------

def full_health_check() -> dict[str, Any]:
    """Run all checks and return a combined summary."""
    conn = connection_check()
    repl = replication_check()

    overall = "ok"
    if conn["status"] == "error":
        overall = "error"
    elif repl["status"] in ("error", "warning"):
        overall = repl["status"]

    return {
        "overall": overall,
        "connection": conn,
        "replication": repl,
    }
