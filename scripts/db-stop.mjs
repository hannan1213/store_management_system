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

// `embedded-postgres` installs a platform-specific binary package. Its
// package.json is not exported, so resolve the entry point and walk to the
// native binaries instead of resolving "package.json".
const platformPackages = {
  "win32-x64": "@embedded-postgres/windows-x64",
  "darwin-x64": "@embedded-postgres/darwin-x64",
  "darwin-arm64": "@embedded-postgres/darwin-arm64",
  "linux-x64": "@embedded-postgres/linux-x64",
  "linux-arm64": "@embedded-postgres/linux-arm64",
};

const platformPackage = platformPackages[`${process.platform}-${process.arch}`];

if (!platformPackage) {
  console.error(`Unsupported platform: ${process.platform}-${process.arch}`);
  process.exit(1);
}

const binDir = path.join(
  path.dirname(require.resolve(platformPackage)),
  "..",
  "native",
  "bin",
);
const pgCtl = path.join(binDir, process.platform === "win32" ? "pg_ctl.exe" : "pg_ctl");

if (!existsSync(pgCtl)) {
  console.error(`pg_ctl not found at ${pgCtl}`);
  process.exit(1);
}

const child = spawn(pgCtl, ["-D", dataDir, "stop", "-m", "fast"], { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
