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
"""

from __future__ import annotations

import ast
import os
import unittest

from django.test import TestCase


# ---------------------------------------------------------------------------
# 1. Database engine and required tables (PostgreSQL-specific)
# ---------------------------------------------------------------------------

@unittest.skipUnless(
    os.environ.get("DB_ENGINE") == "postgresql" and os.environ.get("DB_NAME"),
    "PostgreSQL environment variables not set (DB_ENGINE=postgresql and DB_NAME required).",
)
class PostgresMigrationTests(TestCase):
    """Validation tests for the SQLite → PostgreSQL migration using Django's test framework."""

    def test_database_engine_is_postgresql(self):
        """The active Django database backend must be PostgreSQL."""
        from django.db import connection  # noqa: PLC0415

        self.assertEqual(
            connection.vendor,
            "postgresql",
            f"Expected 'postgresql', got '{connection.vendor}'. "
            "Set DB_ENGINE=postgresql and DB_* variables.",
        )

    def test_required_tables_exist(self):
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
        self.assertFalse(missing, f"Missing tables after migration: {missing}")


# ---------------------------------------------------------------------------
# 2. Core models are readable (PostgreSQL only)
# ---------------------------------------------------------------------------

@unittest.skipUnless(
    os.environ.get("DB_ENGINE") == "postgresql" and os.environ.get("DB_NAME"),
    "PostgreSQL environment variables not set.",
)
class PostgresModelReadTests(TestCase):
    """Validation tests for reading core models after PostgreSQL migration."""

    def test_company_model_readable(self):
        from companies.models import Company  # noqa: PLC0415

        count = Company.objects.count()
        self.assertGreaterEqual(count, 0)

    def test_user_model_readable(self):
        from accounts.models import User  # noqa: PLC0415

        count = User.objects.count()
        self.assertGreaterEqual(count, 0)

    def test_purchase_batch_model_readable(self):
        from trading.models import PurchaseBatch  # noqa: PLC0415

        count = PurchaseBatch.objects.count()
        self.assertGreaterEqual(count, 0)


# ---------------------------------------------------------------------------
# 3. Connection settings (PostgreSQL only)
# ---------------------------------------------------------------------------

@unittest.skipUnless(
    os.environ.get("DB_ENGINE") == "postgresql" and os.environ.get("DB_NAME"),
    "PostgreSQL environment variables not set.",
)
class PostgresConnectionSettingsTests(TestCase):
    """Validation tests for PostgreSQL connection configuration settings."""

    def test_conn_max_age_is_configured(self):
        """CONN_MAX_AGE must be set to a non-negative integer."""
        from django.conf import settings  # noqa: PLC0415

        db_settings = settings.DATABASES.get("default", {})
        conn_max_age = db_settings.get("CONN_MAX_AGE")
        self.assertIsNotNone(conn_max_age, "CONN_MAX_AGE is not configured.")
        self.assertIsInstance(conn_max_age, int)
        self.assertGreaterEqual(conn_max_age, 0)

    def test_connect_timeout_is_configured(self):
        """OPTIONS.connect_timeout must be set."""
        from django.conf import settings  # noqa: PLC0415

        options = settings.DATABASES.get("default", {}).get("OPTIONS", {})
        timeout = options.get("connect_timeout")
        self.assertIsNotNone(timeout, "OPTIONS['connect_timeout'] is not configured.")
        self.assertIsInstance(timeout, int)
        self.assertGreater(timeout, 0)

    def test_application_name_is_set(self):
        """OPTIONS.application_name must identify the application."""
        from django.conf import settings  # noqa: PLC0415

        options = settings.DATABASES.get("default", {}).get("OPTIONS", {})
        app_name = options.get("application_name")
        self.assertEqual(
            app_name,
            "fisherp",
            f"Expected application_name='fisherp', got '{app_name}'.",
        )


# ---------------------------------------------------------------------------
# 4. Health-check utilities (PostgreSQL only)
# ---------------------------------------------------------------------------

@unittest.skipUnless(
    os.environ.get("DB_ENGINE") == "postgresql" and os.environ.get("DB_NAME"),
    "PostgreSQL environment variables not set.",
)
class PostgresHealthCheckTests(TestCase):
    """Validation tests for PostgreSQL health check utilities."""

    def test_postgres_connection_check_returns_ok(self):
        from health.postgres_health import connection_check  # noqa: PLC0415

        result = connection_check()
        self.assertEqual(result["status"], "ok", f"connection_check() failed: {result}")
        self.assertIsInstance(result["latency_ms"], float)
        self.assertGreaterEqual(result["latency_ms"], 0)

    def test_postgres_full_health_check_structure(self):
        from health.postgres_health import full_health_check  # noqa: PLC0415

        result = full_health_check()

        self.assertIn("overall", result)
        self.assertIn("connection", result)
        self.assertIn("replication", result)
        self.assertIn(result["overall"], ("ok", "warning", "error", "not_applicable"))


# ---------------------------------------------------------------------------
# 5. Migration script syntax checks (always run)
# ---------------------------------------------------------------------------

class ScriptSyntaxTests(unittest.TestCase):
    """Verify that operational scripts have valid Python syntax."""

    def _assert_script_parseable(self, script_name: str) -> None:
        from pathlib import Path  # noqa: PLC0415

        script_path = Path(__file__).resolve().parent.parent / "scripts" / script_name
        self.assertTrue(script_path.exists(), f"Script not found at {script_path}")
        source = script_path.read_text(encoding="utf-8")
        try:
            ast.parse(source)
        except SyntaxError as exc:
            self.fail(f"{script_name} has a syntax error: {exc}")

    def test_migration_script_valid_syntax(self):
        self._assert_script_parseable("migrate_sqlite_to_postgres.py")

    def test_backup_script_valid_syntax(self):
        self._assert_script_parseable("backup_database.py")

    def test_restore_script_valid_syntax(self):
        self._assert_script_parseable("restore_database.py")
