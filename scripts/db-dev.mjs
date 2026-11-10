/**
 * Local development PostgreSQL.
 *
 * Starts a real PostgreSQL 17 server (binaries from `embedded-postgres`) using
 * `.pgdata` for storage. No admin rights, service install or Docker required.
 *
 *   npm run db:up     start (creates the cluster + gos_dev database on first run)
 *   npm run db:stop   stop the server
 */

import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const dataDir = path.join(process.cwd(), ".pgdata");
const port = Number(process.env.PGPORT ?? 5432);
const database = process.env.PGDATABASE ?? "gos_dev";
const user = "postgres";
const password = "postgres";

const isFreshCluster = !existsSync(path.join(dataDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user,
  password,
  port,
  persistent: true,
  // npm may skip the package's postinstall symlink step; recreate if needed.
  autoRehydrateSymlinks: true,
});

if (isFreshCluster) {
  await pg.initialise();
  console.log(`Initialised PostgreSQL cluster in ${dataDir}`);
}

await pg.start();

try {
  await pg.createDatabase(database);
  console.log(`Created database "${database}"`);
} catch {
  console.log(`Database "${database}" already exists`);
}

console.log(
  `\nPostgreSQL 17 ready: postgresql://${user}:${password}@127.0.0.1:${port}/${database}\n` +
    "Press Ctrl+C to stop.\n"
);

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`\n${signal} received — stopping PostgreSQL...`);
  await pg.stop();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Keep the process (and therefore the database) alive.
process.stdin.resume();
setInterval(() => {}, 1 << 30);
