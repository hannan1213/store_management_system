import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  databaseTarget,
  getDatabaseStatus,
} from "@/server/services/database-status-service";
import { env } from "@/lib/env";

export const metadata = {
  title: "Database status · GOS",
};

function formatTimestamp(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

/**
 * Live diagnostics: request-time data, so it streams behind the Suspense
 * boundary instead of being baked into the static shell.
 */
async function DatabaseStatusContent() {
  await connection();

  const status = await getDatabaseStatus();
  const applied = status.migrations.filter((m) => m.finishedAt && !m.rolledBackAt);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Badge variant={status.connected ? "default" : "destructive"}>
          {status.connected ? "Connected" : "Not connected"}
        </Badge>
        <span className="text-muted-foreground text-sm">
          {env.REPOSITORY_MODE === "database" ? "Prisma + PostgreSQL" : "In-memory repository"}
        </span>
      </div>

      {!status.connected ? (
        <Card className="mt-8 border-destructive/40">
          <CardHeader>
            <CardTitle>Connection failed</CardTitle>
            <CardDescription>
              Start the local database with <code>npm run db:up</code>, then reload this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-xs">
              {status.error ?? "Unknown error"}
            </pre>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-mono text-lg">
                  {status.latencyMs?.toFixed(1) ?? "—"} ms
                </CardTitle>
                <CardDescription>Query round trip</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{status.productCount ?? "—"}</CardTitle>
                <CardDescription>Products in the database</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{applied.length}</CardTitle>
                <CardDescription>
                  Applied migrations
                  {status.pendingMigrations > 0 ? ` · ${status.pendingMigrations} pending` : ""}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{status.databaseName ?? "—"}</CardTitle>
                <CardDescription>Active database</CardDescription>
              </CardHeader>
            </Card>
          </section>

          <section className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Server</CardTitle>
                <CardDescription>{status.serverVersion ?? "Unknown version"}</CardDescription>
              </CardHeader>
            </Card>
          </section>

          <section className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Migration history</CardTitle>
                <CardDescription>
                  Rows from <code>_prisma_migrations</code>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {status.migrations.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No migrations recorded yet — run <code>npm run db:migrate</code>.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Migration</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Finished</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {status.migrations.map((migration) => (
                        <TableRow key={`${migration.migrationName}-${migration.startedAt}`}>
                          <TableCell className="font-mono text-xs">
                            {migration.migrationName}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {formatTimestamp(migration.startedAt)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {formatTimestamp(migration.finishedAt)}
                          </TableCell>
                          <TableCell>
                            {migration.rolledBackAt ? (
                              <Badge variant="destructive">Rolled back</Badge>
                            ) : migration.finishedAt ? (
                              <Badge>Applied</Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </>
  );
}

function StatusSkeleton() {
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((index) => (
        <Card key={index}>
          <CardHeader>
            <div className="bg-muted h-6 w-16 animate-pulse rounded" />
            <div className="bg-muted h-4 w-32 animate-pulse rounded" />
          </CardHeader>
        </Card>
      ))}
    </section>
  );
}

export default function DatabaseStatusPage() {
  // Development-only screen: never exposed in production builds.
  if (env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">Development only</Badge>
          <span className="text-muted-foreground text-sm">
            {databaseTarget ?? "DATABASE_URL is not set"}
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Database status</h1>
        <p className="text-muted-foreground max-w-2xl">
          Health check for the GOS-002 database setup: connection, latency, catalogue
          row count and the migrations Prisma has applied.
        </p>
      </section>

      <Suspense fallback={<StatusSkeleton />}>
        <DatabaseStatusContent />
      </Suspense>

      <section className="mt-8 flex flex-wrap gap-3">
        <Link className={buttonVariants({ variant: "default" })} href="/">
          Back to app
        </Link>
        <Link className={buttonVariants({ variant: "outline" })} href="/api/dev/database">
          GET /api/dev/database
        </Link>
        <Link className={buttonVariants({ variant: "ghost" })} href="/dev/database">
          Refresh
        </Link>
      </section>
    </main>
  );
}
