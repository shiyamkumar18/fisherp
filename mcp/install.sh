#!/usr/bin/env bash
# MCP Server Dependency Installer

echo "======================================"
echo " Installing FisherP MCP Servers..."
echo "======================================"

# Ensure we have npx available
if ! command -v npx &> /dev/null; then
    echo "[!] npx could not be found. Please install Node.js and npm."
    exit 1
fi

echo "[1/7] Fetching @modelcontextprotocol/server-filesystem..."
npx -y @modelcontextprotocol/server-filesystem --version >/dev/null 2>&1 || echo "Downloaded Filesystem MCP"

echo "[2/7] Fetching @modelcontextprotocol/server-postgres..."
npx -y @modelcontextprotocol/server-postgres --version >/dev/null 2>&1 || echo "Downloaded Postgres MCP"

echo "[3/7] Fetching @modelcontextprotocol/server-github..."
npx -y @modelcontextprotocol/server-github --version >/dev/null 2>&1 || echo "Downloaded GitHub MCP"

echo "[4/7] Fetching @modelcontextprotocol/server-puppeteer..."
npx -y @modelcontextprotocol/server-puppeteer --version >/dev/null 2>&1 || echo "Downloaded Puppeteer MCP"

echo "[5/7] Fetching @docker/mcp-server..."
npx -y @docker/mcp-server --version >/dev/null 2>&1 || echo "Downloaded Docker MCP"

echo "[6/7] Fetching @snyk/mcp-server..."
npx -y @snyk/mcp-server --version >/dev/null 2>&1 || echo "Downloaded Snyk MCP"

echo "[7/7] Fetching mcp-server-redis..."
npx -y mcp-server-redis --version >/dev/null 2>&1 || echo "Downloaded Redis MCP"

echo "======================================"
echo " Installation Complete!"
echo " Please configure your .env file."
echo "======================================"
