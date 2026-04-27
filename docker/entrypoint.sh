#!/bin/sh
set -e

PRISMA_CLI="node ./node_modules/prisma/build/index.js"
TSX_CLI="node ./node_modules/tsx/dist/cli.mjs"

echo "=== SaudeTerritorio — Docker Entrypoint ==="

# ── 1. Wait for PostgreSQL ────────────────────────────────────────────
echo "Waiting for PostgreSQL..."
MAX_RETRIES=30
RETRY=0
until node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$queryRawUnsafe('SELECT 1')
    .then(() => { p.\$disconnect(); process.exit(0); })
    .catch(() => { p.\$disconnect(); process.exit(1); });
" 2>/dev/null; do
  RETRY=$((RETRY + 1))
  if [ "$RETRY" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: PostgreSQL not available after ${MAX_RETRIES} retries"
    exit 1
  fi
  echo "  Retrying ($RETRY/$MAX_RETRIES)..."
  sleep 2
done
echo "PostgreSQL is ready."

# ── 2. Sync database schema ──────────────────────────────────────────
echo "Syncing database schema (prisma db push)..."
$PRISMA_CLI db push --skip-generate --accept-data-loss 2>&1

# ── 3. Apply PostGIS geometry columns ────────────────────────────────
echo "Applying PostGIS extensions and geometry columns..."
node -e "
  const { PrismaClient } = require('@prisma/client');
  const fs = require('fs');
  const p = new PrismaClient();

  async function run() {
    const sqlFile = 'prisma/migrations/00000000000001_add_postgis_geometry/migration.sql';
    if (!fs.existsSync(sqlFile)) {
      console.log('  PostGIS migration file not found, skipping.');
      return;
    }
    const statements = fs.readFileSync(sqlFile, 'utf-8')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      try {
        await p.\$executeRawUnsafe(stmt);
      } catch (e) {
        // Ignore errors (IF NOT EXISTS handles duplicates)
      }
    }
    console.log('  PostGIS geometry columns applied.');
    await p.\$disconnect();
  }
  run().catch(e => { console.error('PostGIS error:', e.message); process.exit(0); });
"

# ── 4. Seed if empty ─────────────────────────────────────────────────
echo "Checking if database needs seeding..."
NEEDS_SEED=$(node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.prefeitura.count()
    .then(c => { p.\$disconnect(); console.log(c === 0 ? 'yes' : 'no'); })
    .catch(() => { p.\$disconnect(); console.log('yes'); });
" 2>/dev/null)

if [ "$NEEDS_SEED" = "yes" ]; then
  echo "Seeding database (first run)..."
  $TSX_CLI prisma/seed/index.ts
  echo "Seed complete."
else
  echo "Database already seeded, skipping."
fi

# ── 5. Start the application ─────────────────────────────────────────
echo ""
echo "=== Starting SaudeTerritorio on port ${PORT:-3000} ==="
echo "    Login: admin@saudeterritorio.dev / admin123"
echo ""
exec "$@"
