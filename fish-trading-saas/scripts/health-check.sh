#!/bin/sh
# =============================================================================
# FisherP – Container Health Check Script
# Used by the HEALTHCHECK Dockerfile instruction.
# Returns 0 (healthy) or 1 (unhealthy).
# =============================================================================
set -e

HOST="${HEALTH_CHECK_HOST:-localhost}"
PORT="${HEALTH_CHECK_PORT:-8000}"
PATH_URL="${HEALTH_CHECK_PATH:-/health/}"

# Attempt an HTTP request to the Django health endpoint.
# curl: -f = fail on HTTP error, -s = silent, -o /dev/null = discard body
curl -fso /dev/null --max-time 5 "http://${HOST}:${PORT}${PATH_URL}"
