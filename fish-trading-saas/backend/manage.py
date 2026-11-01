#!/usr/bin/env python
"""
Django's command-line utility for administrative tasks.

FishERP bootstrap manager.
Handles compatibility fixes and startup validation.
"""

from __future__ import annotations

import datetime
import enum
import logging
import os
import sys


# ==========================================================
# Compatibility Fixes
# ==========================================================
def apply_compatibility_fixes() -> None:
    """
    Apply compatibility patches only when missing.

    These are safe fallbacks for packages expecting
    newer Python enum/datetime features.
    """

    # ------------------------------------------------------
    # datetime.UTC fallback (Python < 3.11)
    # ------------------------------------------------------
    if not hasattr(datetime, "UTC"):
        setattr(datetime, "UTC", datetime.timezone.utc)

    # ------------------------------------------------------
    # enum.StrEnum fallback (Python < 3.11)
    # ------------------------------------------------------
    if not hasattr(enum, "StrEnum"):

        class StrEnum(str, enum.Enum):
            """
            Fallback implementation for enum.StrEnum.
            """

        setattr(enum, "StrEnum", StrEnum)

    # ------------------------------------------------------
    # enum.EnumType fallback
    # ------------------------------------------------------
    if not hasattr(enum, "EnumType"):
        setattr(enum, "EnumType", enum.EnumMeta)

    # ------------------------------------------------------
    # enum.property fallback
    # ------------------------------------------------------
    if not hasattr(enum, "property"):
        setattr(enum, "property", property)

    # ------------------------------------------------------
    # enum.nonmember fallback
    # ------------------------------------------------------
    if not hasattr(enum, "nonmember"):

        class nonmember:
            """
            Fallback implementation for enum.nonmember.
            """

            def __init__(self, value: object) -> None:
                self.value = value

            def __get__(self, instance: object, owner: type[object]) -> object:
                return self.value

        setattr(enum, "nonmember", nonmember)


# ==========================================================
# Logging Configuration
# ==========================================================
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
)

logger = logging.getLogger(__name__)


# ==========================================================
# Environment Validation
# ==========================================================
def validate_environment() -> None:
    """
    Validate runtime environment.
    """

    python_version = sys.version_info

    if python_version < (3, 10):
        raise RuntimeError(
            "FishERP requires Python 3.10 or higher.\n"
            f"Current version: {python_version.major}."
            f"{python_version.minor}"
        )


# ==========================================================
# Main Entry Point
# ==========================================================
def main() -> None:
    """
    Run Django administrative tasks.
    """

    # Apply compatibility fixes
    apply_compatibility_fixes()

    # Validate environment
    validate_environment()

    # Set default Django settings
    os.environ.setdefault(
        "DJANGO_SETTINGS_MODULE",
        "config.settings"
    )

    try:
        from django.core.management import (
            execute_from_command_line,
        )
        logger.info(
            "Starting FishERP Django command..."
        )
        execute_from_command_line(sys.argv)

    except ImportError as exc:
        logger.exception(
            "Failed to import Django."
        )

        raise ImportError(
            "\nCouldn't import Django.\n\n"
            "Possible causes:\n"
            "1. Virtual environment not activated\n"
            "2. Django not installed\n"
            "3. Missing dependencies\n"
            "4. Wrong Python interpreter\n\n"
            "Recommended fix:\n"
            "----------------------------------\n"
            "source .venv/bin/activate\n"
            "pip install -r requirements.txt\n"
            "----------------------------------"
        ) from exc


# ==========================================================
# Entrypoint
# ==========================================================
if __name__ == "__main__":
    main()