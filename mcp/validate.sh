#!/usr/bin/env bash
# MCP Server Configuration Validator

echo "======================================"
echo " Validating FisherP MCP Configuration"
echo "======================================"

# 1. Check for .env file
if [ ! -f .env ]; then
    echo "[!] .env file missing! Please copy .env.example to .env and configure it."
    exit 1
else
    echo "[✓] .env file found."
fi

# Load variables
source .env

# 2. Check variables
MISSING=0

if [ -z "$POSTGRES_MCP_URL" ]; then
    echo "[!] POSTGRES_MCP_URL is missing."
    MISSING=1
else
    echo "[✓] POSTGRES_MCP_URL is set."
fi

if [ -z "$GITHUB_PAT" ]; then
    echo "[!] GITHUB_PAT is missing."
    MISSING=1
else
    echo "[✓] GITHUB_PAT is set."
fi

if [ -z "$REDIS_MCP_URL" ]; then
    echo "[!] REDIS_MCP_URL is missing."
    MISSING=1
else
    echo "[✓] REDIS_MCP_URL is set."
fi

if [ "$MISSING" -eq 1 ]; then
    echo "======================================"
    echo " Validation Failed: Missing variables."
    exit 1
fi

echo "======================================"
echo " Validation Passed! Configuration looks good."
echo " Load mcp-servers.json into your MCP client."
echo "======================================"
