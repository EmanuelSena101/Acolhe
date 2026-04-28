import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { db } from "./db";

let bootstrapped = false;
let inFlight: Promise<void> | null = null;

const PRISMA_CLI = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
const TSX_CLI = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");
const SEED_FILE = path.join(process.cwd(), "prisma", "seed", "index.ts");

export async function runBootstrap(): Promise<void> {
  if (bootstrapped) return;
  if (inFlight) return inFlight;
  inFlight = doBootstrap()
    .then(() => {
      bootstrapped = true;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

async function doBootstrap(): Promise<void> {
  console.log("[bootstrap] starting…");

  await waitForDatabase();
  await ensureSchema();
  await applyRawMigrations();
  await ensureSeed();

  console.log("[bootstrap] done.");
}

async function waitForDatabase(): Promise<void> {
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await db.$queryRawUnsafe("SELECT 1");
      console.log("[bootstrap] database is reachable.");
      return;
    } catch {
      if (attempt === maxAttempts) {
        throw new Error("database not reachable after 30 attempts");
      }
      await sleep(2000);
    }
  }
}

async function ensureSchema(): Promise<void> {
  try {
    await db.$queryRawUnsafe('SELECT 1 FROM "Usuario" LIMIT 1');
    return;
  } catch {
    // table missing → push schema
  }

  if (!existsSync(PRISMA_CLI)) {
    console.warn("[bootstrap] prisma CLI not found, skipping db push.");
    return;
  }

  console.log("[bootstrap] applying schema (prisma db push)…");
  execSync(`node ${quote(PRISMA_CLI)} db push --skip-generate --accept-data-loss`, {
    stdio: "inherit",
    cwd: process.cwd(),
  });
}

async function applyRawMigrations(): Promise<void> {
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
        // idempotent — IF NOT EXISTS handles duplicates
      }
    }
  }
  console.log("[bootstrap] raw migrations applied.");
}

async function ensureSeed(): Promise<void> {
  let needsSeed = false;
  try {
    const count = await db.prefeitura.count();
    needsSeed = count === 0;
  } catch (err) {
    console.warn("[bootstrap] could not count prefeituras:", err);
    return;
  }

  if (!needsSeed) {
    console.log("[bootstrap] database already seeded.");
    return;
  }

  if (!existsSync(SEED_FILE) || !existsSync(TSX_CLI)) {
    console.warn("[bootstrap] seed file or tsx not found — skipping seed.");
    return;
  }

  console.log("[bootstrap] seeding database (first run)…");
  execSync(`node ${quote(TSX_CLI)} ${quote(SEED_FILE)}`, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: { ...process.env, SKIP_BOOTSTRAP: "1" },
  });
  console.log("[bootstrap] seed finished.");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quote(p: string): string {
  return `"${p.replace(/"/g, '\\"')}"`;
}
