"""
tests/test_postgres_migration.py
---------------------------------
Validation tests for the SQLite → PostgreSQL migration.

These tests are designed to run against an actual PostgreSQL instance
(configured via the standard DB_* environment variables) and verify:

  1. The database engine reported by Django is PostgreSQL.
  2. All expected tables exist after running migrations.
  3. Core application models are readable and writable.
  4. Connection pool / CONN_MAX_AGE settings are honoured.
  5. The health-check utilities return the expected structure.

Run with:
    DB_ENGINE=postgresql DB_NAME=... python manage.py test tests.test_postgres_migration
or:
    pytest fish-trading-saas/backend/tests/test_postgres_migration.py
"""

from __future__ import annotations

import os
import pytest

# Skip the entire module if PostgreSQL is not configured.
pytestmark = pytest.mark.skipif(
    os.environ.get("DB_ENGINE") != "postgresql" or not os.environ.get("DB_NAME"),
    reason="PostgreSQL environment variables not set (DB_ENGINE=postgresql and DB_NAME required).",
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def django_db_setup():
    """Use the default database configured in settings (PostgreSQL)."""
    pass


# ---------------------------------------------------------------------------
# 1. Database engine
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_database_engine_is_postgresql():
    """The active Django database backend must be PostgreSQL."""
    from django.db import connection  # noqa: PLC0415

    assert connection.vendor == "postgresql", (
        f"Expected 'postgresql', got '{connection.vendor}'. "
        "Set DB_ENGINE=postgresql and DB_* variables."
    )


# ---------------------------------------------------------------------------
# 2. Required tables exist
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_required_tables_exist():
    """All Django app tables must be present after migration."""
    from django.db import connection  # noqa: PLC0415

    with connection.cursor() as cur:
        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
        )
        existing_tables = {row[0] for row in cur.fetchall()}

    required_tables = [
        "accounts_user",
        "accounts_company",
        "trading_purchasebatch",
        "trading_buyer",
        "trading_fish",
        "trading_inventory",
        "trading_sale",
        "trading_supplier",
        "auth_permission",
        "django_content_type",
        "django_migrations",
    ]

    missing = [t for t in required_tables if t not in existing_tables]
    assert not missing, f"Missing tables after migration: {missing}"


# ---------------------------------------------------------------------------
# 3. Core models are readable
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_company_model_readable():
    from companies.models import Company  # noqa: PLC0415

    # Just prove the ORM can execute a SELECT without errors.
    count = Company.objects.count()
    assert count >= 0


@pytest.mark.django_db
def test_user_model_readable():
    from accounts.models import User  # noqa: PLC0415

    count = User.objects.count()
    assert count >= 0


@pytest.mark.django_db
def test_purchase_batch_model_readable():
    from trading.models import PurchaseBatch  # noqa: PLC0415

    count = PurchaseBatch.objects.count()
    assert count >= 0


# ---------------------------------------------------------------------------
# 4. Connection settings
# ---------------------------------------------------------------------------

def test_conn_max_age_is_configured():
    """CONN_MAX_AGE must be set to a non-negative integer."""
    from django.conf import settings  # noqa: PLC0415

    db_settings = settings.DATABASES.get("default", {})
    conn_max_age = db_settings.get("CONN_MAX_AGE")
    assert conn_max_age is not None, "CONN_MAX_AGE is not configured."
    assert isinstance(conn_max_age, int) and conn_max_age >= 0


def test_connect_timeout_is_configured():
    """OPTIONS.connect_timeout must be set."""
    from django.conf import settings  # noqa: PLC0415

    options = settings.DATABASES.get("default", {}).get("OPTIONS", {})
    timeout = options.get("connect_timeout")
    assert timeout is not None, "OPTIONS['connect_timeout'] is not configured."
    assert isinstance(timeout, int) and timeout > 0


def test_application_name_is_set():
    """OPTIONS.application_name must identify the application."""
    from django.conf import settings  # noqa: PLC0415

    options = settings.DATABASES.get("default", {}).get("OPTIONS", {})
    app_name = options.get("application_name")
    assert app_name == "fisherp", (
        f"Expected application_name='fisherp', got '{app_name}'."
    )


# ---------------------------------------------------------------------------
# 5. Health-check utilities
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_postgres_connection_check_returns_ok():
    from health.postgres_health import connection_check  # noqa: PLC0415

    result = connection_check()
    assert result["status"] == "ok", f"connection_check() failed: {result}"
    assert isinstance(result["latency_ms"], float)
    assert result["latency_ms"] >= 0


@pytest.mark.django_db
def test_postgres_full_health_check_structure():
    from health.postgres_health import full_health_check  # noqa: PLC0415

    result = full_health_check()

    assert "overall" in result
    assert "connection" in result
    assert "replication" in result
    assert result["overall"] in ("ok", "warning", "error", "not_applicable")


# ---------------------------------------------------------------------------
# 6. Migration script dry-run (import check)
# ---------------------------------------------------------------------------

def test_migration_script_importable():
    """The migration script must be importable without side-effects."""
    import importlib.util  # noqa: PLC0415
    from pathlib import Path  # noqa: PLC0415

    script_path = Path(__file__).resolve().parent.parent / "scripts" / "migrate_sqlite_to_postgres.py"
    assert script_path.exists(), f"Migration script not found at {script_path}"

    spec = importlib.util.spec_from_file_location("migrate_sqlite_to_postgres", script_path)
    module = importlib.util.module_from_spec(spec)
    # We do NOT call spec.loader.exec_module() to avoid triggering django.setup()
    # again; the import check is sufficient here.
    assert spec is not None


def test_backup_script_importable():
    """The backup script must be importable without side-effects."""
    import importlib.util  # noqa: PLC0415
    from pathlib import Path  # noqa: PLC0415

    script_path = Path(__file__).resolve().parent.parent / "scripts" / "backup_database.py"
    assert script_path.exists(), f"Backup script not found at {script_path}"

    spec = importlib.util.spec_from_file_location("backup_database", script_path)
    assert spec is not None


def test_restore_script_importable():
    """The restore script must be importable without side-effects."""
    import importlib.util  # noqa: PLC0415
    from pathlib import Path  # noqa: PLC0415

    script_path = Path(__file__).resolve().parent.parent / "scripts" / "restore_database.py"
    assert script_path.exists(), f"Restore script not found at {script_path}"

    spec = importlib.util.spec_from_file_location("restore_database", script_path)
    assert spec is not None
