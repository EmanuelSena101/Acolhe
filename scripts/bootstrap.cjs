/* eslint-disable */
const { execSync } = require("child_process");
const { existsSync, readFileSync, readdirSync } = require("fs");
const path = require("path");

const ROOT = process.cwd();
const PRISMA_CLI = path.join(ROOT, "node_modules", "prisma", "build", "index.js");
const TSX_CLI = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const MIGRATIONS_DIR = path.join(ROOT, "prisma", "migrations");
const SEED_FILE = path.join(ROOT, "prisma", "seed", "index.ts");

async function main() {
  console.log("[bootstrap] starting…");

  const { PrismaClient } = require(path.join(ROOT, "node_modules", "@prisma", "client"));
  const db = new PrismaClient();

  await waitForDatabase(db);
  await ensureSchema(db);
  await applyRawMigrations(db);
  await ensureSeed(db);

  await db.$disconnect();
  console.log("[bootstrap] done.");
}

async function waitForDatabase(db) {
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await db.$queryRawUnsafe("SELECT 1");
      console.log("[bootstrap] database is reachable.");
      return;
    } catch {
      if (attempt === 30) throw new Error("database not reachable after 30 attempts");
      await sleep(2000);
    }
  }
}

async function ensureSchema(db) {
  try {
    await db.$queryRawUnsafe('SELECT 1 FROM "Usuario" LIMIT 1');
    return;
  } catch {
    // missing → push
  }
  if (!existsSync(PRISMA_CLI)) {
    console.warn("[bootstrap] prisma CLI not found, skipping db push.");
    return;
  }
  console.log("[bootstrap] applying schema (prisma db push)…");
  execSync(`node "${PRISMA_CLI}" db push --skip-generate --accept-data-loss`, {
    stdio: "inherit",
    cwd: ROOT,
  });
}

async function applyRawMigrations(db) {
  if (!existsSync(MIGRATIONS_DIR)) return;
  const dirs = readdirSync(MIGRATIONS_DIR)
    .filter((d) => /^\d+_/.test(d))
    .sort();
  for (const dir of dirs) {
    const file = path.join(MIGRATIONS_DIR, dir, "migration.sql");
    if (!existsSync(file)) continue;
    const sql = readFileSync(file, "utf-8");
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));
    for (const stmt of statements) {
      try {
        await db.$executeRawUnsafe(stmt);
      } catch {
        // idempotent
      }
    }
  }
  console.log("[bootstrap] raw migrations applied.");
}

async function ensureSeed(db) {
  let needsSeed = false;
  try {
    const count = await db.prefeitura.count();
    needsSeed = count === 0;
  } catch (err) {
    console.warn("[bootstrap] could not count prefeituras:", err && err.message);
    return;
  }
  if (!needsSeed) {
    console.log("[bootstrap] database already seeded.");
    return;
  }
  if (!existsSync(SEED_FILE) || !existsSync(TSX_CLI)) {
    console.warn("[bootstrap] seed file or tsx not found — skipping.");
    return;
  }
  console.log("[bootstrap] seeding database (first run)…");
  execSync(`node "${TSX_CLI}" "${SEED_FILE}"`, {
    stdio: "inherit",
    cwd: ROOT,
  });
  console.log("[bootstrap] seed finished.");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("[bootstrap] fatal:", err);
  process.exit(1);
});
