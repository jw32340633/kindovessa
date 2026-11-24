"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import FeaturedProductTable, { featuredProductLimit } from "@/sections/merchandising/featured-product-table";
import PricingDiscountsTable, { type DiscountChange } from "@/sections/merchandising/pricing-discounts-table";
import { catalogButtonShadow } from "@/sections/catalog/catalog-table-controls";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  type ProductDiscountBadge,
} from "@/data/catalog-data";

import { Category, categoryTitles } from "@/data/enum";

type SalesProduct = {
  id: string;
  name: string;
  brand: string;
  category: Category;
  imageUrl: string | null;
  price: string;
  isFeaturedProduct: boolean;
  discountPrice: string;
  discountBadge: ProductDiscountBadge;
  isDiscountPrice: boolean;
  saleTag: string;
  version: number;
};
type SalesData = {
  products: SalesProduct[];
  storefront: { collectionCategory: Category | null; version: number };
};
type Confirmation = {
  kind: "featured" | "visibility" | "discount" | "remove";
  featuredIds?: string[];
  discount?: DiscountChange;
  destructive?: boolean;
  title: string;
  description: string;
};

const selectClass =
  "h-11 w-full min-w-0 rounded-none border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

class SalesRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function salesRequest<T>(path = "", options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/sales${path}`, {
    cache: "no-store",
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data)
    throw new SalesRequestError(
      data?.error?.message ?? "Unable to complete the sales request.",
      response.status,
    );
  return data;
}

function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function SaleCard({
  title,
  refresh,
  children,
}: {
  title: React.ReactNode;
  refresh: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
        <h2 className="flex items-center gap-3 text-xl font-semibold">{title}</h2>
        {refresh}
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-5">{children}</CardContent>
    </Card>
  );
}

function MerchandisingHeading({ action }: { action?: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Storefront Merchandising</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage featured products, collections, discounts, and promotional badges.
          </p>
        </div>
        {action && <div className="flex flex-wrap gap-3">{action}</div>}
      </div>
      <Separator className="h-0.5 w-full" />
    </>
  );
}

function SalesControls({ initial }: { initial: SalesData }) {
  const [data, setData] = useState(initial);
  const [adding, setAdding] = useState(false);
  const { products, storefront } = data;
  const [category, setCategory] = useState(storefront.collectionCategory);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState<Confirmation["kind"] | "reload" | null>(
    null,
  );
  const [needsReload, setNeedsReload] = useState(false);

  const currentFeatured = products.filter(
    (product) => product.isFeaturedProduct,
  );
  const visibilityChanged = category !== storefront.collectionCategory;
  const locked = Boolean(busy) || needsReload;

  async function reload(card: "featured" | "visibility" | "pricing") {
    setBusy("reload");
    try {
      const latest = await salesRequest<SalesData>();
      setData(latest);
      if (card === "visibility" || latest.storefront.collectionCategory !== storefront.collectionCategory) {
        setCategory(latest.storefront.collectionCategory);
      }
      setNeedsReload(false);
      toast.success(card === "pricing" ? "Saved pricing reloaded." : "Saved settings reloaded.");
    } catch (error) {
      toast.error(message(error));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!confirmation || busy) return;
    const { kind } = confirmation;
    setBusy(kind);
    try {
      const options = {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      };
      if (kind === "visibility" || kind === "featured") {
        const featuredIds = new Set(confirmation.featuredIds ?? currentFeatured.map(({ id }) => id));
        const saved = await salesRequest<{
          storefront: SalesData["storefront"];
        }>("/visibility", {
          ...options,
          body: JSON.stringify({
            version: storefront.version,
            collectionCategory: kind === "visibility" ? category : storefront.collectionCategory,
            featuredProductIds: [...featuredIds],
          }),
        });
        setData({
          ...data,
          storefront: saved.storefront,
          products: products.map((product) => {
            const selected = featuredIds.has(product.id);
            return selected === product.isFeaturedProduct
              ? product
              : {
                  ...product,
                  isFeaturedProduct: selected,
                  version: product.version + 1,
                };
          }),
        });
        toast.success(kind === "featured" ? "Featured products updated." : "Collection category saved.");
      } else if (confirmation.discount) {
        const { product: currentProduct, price, badge } = confirmation.discount;
        const { product } = await salesRequest<{ product: SalesProduct }>(
          `/${currentProduct.id}`,
          {
            ...options,
            body: JSON.stringify({
              version: currentProduct.version,
              discountPrice: price,
              discountBadge: badge,
            }),
          },
        );
        setData({
          ...data,
          products: products.map((item) =>
            item.id === product.id ? product : item,
          ),
        });
        toast.success(kind === "remove" ? "Sale price and badge removed." : "Sale price saved.");
      }
    } catch (error) {
      toast.error(message(error));
      setNeedsReload(
        !(error instanceof SalesRequestError) ||
          [404, 409].includes(error.status) ||
          error.status >= 500,
      );
    } finally {
      setBusy(null);
      setConfirmation(null);
    }
  }

  function refreshButton(card: "featured" | "visibility" | "pricing") {
    return (
      <Button variant="outline" className="h-11 rounded-none" style={{ boxShadow: catalogButtonShadow }}
        disabled={Boolean(busy)} onClick={() => void reload(card)}>
        {busy === "reload" ? <><Spinner aria-hidden="true" /> Refreshing</> : <><RefreshCw aria-hidden="true" /> Refresh</>}
      </Button>
    );
  }

  return (
    <>
      <MerchandisingHeading action={
        <Button type="button" className="h-12 gap-2 rounded-none px-6 text-sm font-semibold"
          style={{ boxShadow: catalogButtonShadow }}
          disabled={locked || currentFeatured.length === products.length || currentFeatured.length >= featuredProductLimit}
          onClick={() => setAdding(true)}>
          <Plus className="size-4 shrink-0" aria-hidden="true" /> Add Featured Product
        </Button>
      } />
      <PricingDiscountsTable products={products} locked={locked} refresh={refreshButton("pricing")}
        onSave={(discount) => {
          const removing = discount.price === "0";
          setConfirmation({
            kind: removing ? "remove" : "discount",
            title: removing ? "Remove this sale price?" : "Save sale price?",
            description: removing
              ? `${discount.product.name} will return to $${discount.product.price} and its sale badge will be cleared.`
              : `Set ${discount.product.name} to $${discount.price}. Badge: ${discount.badgeLabel}.`,
            discount,
          });
        }} />
      <FeaturedProductTable key={currentFeatured.map(({ id }) => id).join(",")} products={products}
        adding={adding} closeAdd={() => setAdding(false)}
        locked={locked} refresh={refreshButton("featured")}
        onChange={(featuredIds, action, count) => setConfirmation({
          kind: "featured", featuredIds, destructive: action === "remove",
          title: action === "add" ? "Add featured products?" : "Remove featured products?",
          description: action === "add"
            ? `Add ${count} selected ${count === 1 ? "product" : "products"} to the featured section of the storefront.`
            : `Remove ${count} selected ${count === 1 ? "product" : "products"} from the featured section.`,
        })} />
      <SaleCard
        title={
          <>
            Collection Category
            <span
              role="img"
              aria-label={storefront.collectionCategory ? "Collection category active" : "No active collection category"}
              className={`size-4 shrink-0 rounded-full ${storefront.collectionCategory
                ? "bg-green-500 motion-safe:animate-pulse"
                : "bg-muted-foreground/40"}`}
            />
          </>
        }
        refresh={refreshButton("visibility")}
      >
        <div className="space-y-3">
          <Label htmlFor="collection-category">Select category</Label>
          <select
            id="collection-category"
            className={selectClass}
            value={category ?? ""}
            disabled={locked}
            onChange={(event) => setCategory((event.target.value || null) as Category | null)}
          >
            <option value="">No category</option>
            {storefront.collectionCategory ? (
              <option value={storefront.collectionCategory}>
                {categoryTitles[storefront.collectionCategory]}
              </option>
            ) : Object.values(Category).map((slug) => <option key={slug} value={slug}>{categoryTitles[slug]}</option>)}
          </select>
          {storefront.collectionCategory && !category && (
            <p className="text-muted-foreground">Save the removal before choosing another category.</p>
          )}
        </div>
        <div className="flex justify-end">
          <Button
            className="h-11 rounded-none bg-black px-4 text-white hover:bg-black/85 hover:text-white" style={{ boxShadow: catalogButtonShadow }}
            disabled={locked || !visibilityChanged}
            onClick={() =>
              setConfirmation({
                kind: "visibility",
                title: category ? "Save collection category?" : "Remove collection category?",
                destructive: !category,
                description: `Collection category: ${category ? categoryTitles[category] : "None"}.`,
              })
            }
          >
            Save collection
          </Button>
        </div>
      </SaleCard>
      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-none" style={{ boxShadow: catalogButtonShadow }} disabled={Boolean(busy)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-none" style={{ boxShadow: catalogButtonShadow }}
              disabled={Boolean(busy)}
              variant={
                confirmation?.kind === "remove" || confirmation?.destructive ? "destructive" : "default"
              }
              onClick={save}
            >
              {busy ? <>Saving <Spinner aria-hidden="true" /></> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function DashboardMerchandisingPage() {
  const [data, setData] = useState<SalesData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    salesRequest<SalesData>("", { signal: controller.signal })
      .then(setData)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setError(message(error));
      });
    return () => controller.abort();
  }, [attempt]);

  return (
    <main className="dashboard-layout">
      {!data && <MerchandisingHeading />}
      {data ? (
        <SalesControls initial={data} />
      ) : error ? (
        <div className="space-y-3 rounded-xl border bg-card p-6">
          <p role="alert">{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : (
        <div
          aria-busy="true"
          aria-label="Loading sales settings"
          className="grid gap-5"
        >
          <Skeleton className="h-[60rem]" />
          <Skeleton className="h-[31rem]" />
          <Skeleton className="h-64" />
        </div>
      )}
    </main>
  );
}
