import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import productService from "@/server/services/product-service";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";

const LAYERS = [
  {
    name: "Validation",
    path: "src/server/validation",
    detail: "Zod schemas parse every body, query and route param before it reaches a service.",
  },
  {
    name: "Service",
    path: "src/server/services",
    detail: "Business rules live here. Throws typed AppError; storage-agnostic.",
  },
  {
    name: "Repository",
    path: "src/server/repositories",
    detail: "The only layer that knows where data lives. Swap memory for a database here.",
  },
  {
    name: "HTTP",
    path: "src/server/http",
    detail: "One wrapper maps every thrown error to the { ok, error } response envelope.",
  },
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * Live catalogue data. Rendered per request behind a Suspense boundary so the
 * static shell (header, architecture notes) still prerenders.
 */
async function CatalogueSection() {
  await connection();

  let result: Awaited<ReturnType<typeof productService.list>>;
  try {
    result = await productService.list({ page: 1, pageSize: 5 });
  } catch (error) {
    // A stopped database must not crash the page: show a recovery hint instead.
    if (!(error instanceof AppError)) {
      console.error("[home] Failed to load the catalogue:", error);
    }
    return (
      <CatalogueUnavailable
        message={
          error instanceof AppError
            ? error.message
            : "The catalogue could not be loaded."
        }
      />
    );
  }

  const { items, total } = result;
  const lowStock = items.filter((product) => product.stock <= 5);

  return (
    <>
      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{total}</CardTitle>
            <CardDescription>Products served from the repository layer</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{lowStock.length}</CardTitle>
            <CardDescription>Low-stock items on this page (≤ 5 units)</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{LAYERS.length}</CardTitle>
            <CardDescription>Server layers with conventions wired in</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Catalogue preview</CardTitle>
            <CardDescription>
              Rendered server-side from <code>productService.list()</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[7rem]">SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[8rem] text-right">Price</TableHead>
                  <TableHead className="w-[7rem] text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">{currency.format(product.price)}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          product.stock === 0
                            ? "destructive"
                            : product.stock <= 5
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {product.stock}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function CatalogueSkeleton() {
  return (
    <section className="mt-10 grid gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <Card key={index}>
          <CardHeader>
            <div className="bg-muted h-6 w-12 animate-pulse rounded" />
            <div className="bg-muted h-4 w-40 animate-pulse rounded" />
          </CardHeader>
        </Card>
      ))}
    </section>
  );
}

function CatalogueUnavailable({ message }: { message: string }) {
  return (
    <section className="mt-10">
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Catalogue unavailable</CardTitle>
          <CardDescription>
            Start the local database with <code>npm run db:up</code>, then reload this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{message}</p>
          <Link
            className={`${buttonVariants({ variant: "outline" })} mt-4 inline-flex`}
            href="/"
          >
            Retry
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">GOS-001</Badge>
          <span className="text-muted-foreground text-sm">
            Project scaffold — Next.js App Router · TypeScript · Tailwind CSS · shadcn/ui
          </span>
          {env.NODE_ENV !== "production" ? (
            <Link
              className="text-sm underline underline-offset-4 hover:text-foreground"
              href="/dev/database"
            >
              Database status
            </Link>
          ) : null}
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Store management system
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          The frontend and backend share one codebase: route handlers under <code>/api</code> call
          validation → service → repository, and server components reuse the same services
          directly. The table below is served by the product service, no HTTP hop.
        </p>
      </section>

      <Suspense fallback={<CatalogueSkeleton />}>
        <CatalogueSection />
      </Suspense>

      <section className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Backend architecture</CardTitle>
            <CardDescription>Where conventions live and what each layer is allowed to do</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {LAYERS.map((layer) => (
              <div key={layer.name} className="border-border/60 rounded-lg border p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium">{layer.name}</p>
                  <code className="text-muted-foreground text-xs">{layer.path}</code>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{layer.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 flex flex-wrap items-center gap-3">
        <Link className={buttonVariants({ variant: "default" })} href="/api/health">
          GET /api/health
        </Link>
        <Link className={buttonVariants({ variant: "outline" })} href="/api/products">
          GET /api/products
        </Link>
        <Link className={buttonVariants({ variant: "outline" })} href="/api/products/bev-001">
          GET /api/products/:id
        </Link>
        <span className="text-muted-foreground text-sm">
          All responses follow <code>{`{ ok, data }`}</code> / <code>{`{ ok, error }`}</code>
        </span>
      </section>
    </main>
  );
}
