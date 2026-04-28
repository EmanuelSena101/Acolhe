#!/bin/sh
set -e

echo "=== SaudeTerritorio — Docker Entrypoint ==="

if [ -f scripts/bootstrap.cjs ]; then
  node scripts/bootstrap.cjs
else
  echo "WARNING: scripts/bootstrap.cjs not found — skipping bootstrap."
fi

echo ""
echo "=== Starting SaudeTerritorio on port ${PORT:-3000} ==="
echo "    Login: admin@saudeterritorio.dev / admin123"
echo ""
exec "$@"
