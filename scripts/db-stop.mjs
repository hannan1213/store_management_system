/**
 * Stop the local development PostgreSQL server started by `npm run db:up`.
 * Safe to run when the server is already stopped.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dataDir = path.join(process.cwd(), ".pgdata");

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  console.log("No local cluster found in .pgdata — nothing to stop.");
  process.exit(0);
}

const binDir = path.dirname(require.resolve("@embedded-postgres/windows-x64/package.json"));
const pgCtl = path.join(binDir, "native", "bin", "pg_ctl.exe");

if (!existsSync(pgCtl)) {
  console.error(`pg_ctl.exe not found at ${pgCtl}`);
  process.exit(1);
}

const child = spawn(pgCtl, ["-D", dataDir, "stop", "-m", "fast"], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
