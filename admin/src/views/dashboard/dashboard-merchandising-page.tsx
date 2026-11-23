"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  catalogCategoryTitle,
  discountBadgeTypes,
  type ProductDiscountBadge,
} from "@/data/catalog-data";

type SalesProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
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
  categories: { slug: string; title: string }[];
  storefront: { collectionCategory: string | null; version: number };
};
type Confirmation = {
  kind: "visibility" | "discount" | "remove";
  title: string;
  description: string;
};

const selectClass =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

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

function usd(price: string) {
  return `$${price}`;
}

function cents(value: string) {
  if (!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function SaleCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function SalesControls({ initial }: { initial: SalesData }) {
  const [data, setData] = useState(initial);
  const { products, storefront, categories } = data;
  const [featured, setFeatured] = useState(
    () =>
      new Set(
        products
          .filter((product) => product.isFeaturedProduct)
          .map((product) => product.id),
      ),
  );
  const [category, setCategory] = useState(storefront.collectionCategory);
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [badge, setBadge] = useState<ProductDiscountBadge>("none");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState<Confirmation["kind"] | "reload" | null>(
    null,
  );
  const [feedback, setFeedback] = useState<{
    card: "visibility" | "pricing";
    error: boolean;
    text: string;
  } | null>(null);
  const [needsReload, setNeedsReload] = useState(false);

  const currentProduct = products.find((product) => product.id === productId);
  const currentFeatured = products.filter(
    (product) => product.isFeaturedProduct,
  );
  const visibilityChanged =
    category !== storefront.collectionCategory ||
    featured.size !== currentFeatured.length ||
    currentFeatured.some((product) => !featured.has(product.id));
  const matches = products.filter((product) =>
    `${product.name} ${product.brand} ${catalogCategoryTitle(product.category, categories)}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const baseCents = cents(currentProduct?.price ?? "");
  const saleCents = cents(price);
  const priceError =
    price === ""
      ? ""
      : saleCents === null || saleCents === 0
        ? "Enter a positive USD price with up to two decimal places."
        : baseCents === null || saleCents >= baseCents
          ? "Sale price must be lower than the regular price."
          : "";
  const validPrice = price !== "" && !priceError;
  const savings = validPrice ? baseCents! - saleCents! : 0;
  const percent =
    validPrice && savings * 100 >= baseCents!
      ? Math.floor((savings * 100) / baseCents!)
      : "<1";
  const badgeLabels: Record<ProductDiscountBadge, string> = {
    none: "No badge",
    "percent-off": `${percent}% OFF`,
    "save-amount": `SAVE ${usd((savings / 100).toFixed(2))}`,
    "now-price": `NOW ${usd(((saleCents ?? 0) / 100).toFixed(2))}`,
    "flat-percent-off": `FLAT ${percent}% OFF`,
  };
  const discountChanged =
    currentProduct &&
    (saleCents !== cents(currentProduct.discountPrice) ||
      badge !== currentProduct.discountBadge);
  const locked = Boolean(busy) || needsReload;

  function editProduct(product?: SalesProduct) {
    setProductId(product?.id ?? "");
    setPrice(product?.isDiscountPrice ? product.discountPrice : "");
    setBadge(product?.discountBadge ?? "none");
  }

  async function reload() {
    setBusy("reload");
    try {
      const latest = await salesRequest<SalesData>();
      setData(latest);
      setFeatured(
        new Set(
          latest.products
            .filter((product) => product.isFeaturedProduct)
            .map((product) => product.id),
        ),
      );
      setCategory(latest.storefront.collectionCategory);
      editProduct(latest.products.find((product) => product.id === productId));
      setNeedsReload(false);
      setFeedback({
        card: "visibility",
        error: false,
        text: "Saved settings reloaded.",
      });
    } catch (error) {
      setFeedback({ card: "visibility", error: true, text: message(error) });
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!confirmation || busy) return;
    const { kind } = confirmation;
    const card = kind === "visibility" ? "visibility" : "pricing";
    setBusy(kind);
    setFeedback(null);
    try {
      const options = {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      };
      if (kind === "visibility") {
        const saved = await salesRequest<{
          storefront: SalesData["storefront"];
        }>("/visibility", {
          ...options,
          body: JSON.stringify({
            version: storefront.version,
            collectionCategory: category,
            featuredProductIds: [...featured],
          }),
        });
        setData({
          ...data,
          storefront: saved.storefront,
          products: products.map((product) => {
            const selected = featured.has(product.id);
            return selected === product.isFeaturedProduct
              ? product
              : {
                  ...product,
                  isFeaturedProduct: selected,
                  version: product.version + 1,
                };
          }),
        });
        setFeedback({
          card,
          error: false,
          text: "Storefront visibility saved.",
        });
      } else if (currentProduct) {
        const { product } = await salesRequest<{ product: SalesProduct }>(
          `/${currentProduct.id}`,
          {
            ...options,
            body: JSON.stringify({
              version: currentProduct.version,
              discountPrice: kind === "remove" ? "0" : price,
              discountBadge: kind === "remove" ? "none" : badge,
            }),
          },
        );
        setData({
          ...data,
          products: products.map((item) =>
            item.id === product.id ? product : item,
          ),
        });
        editProduct(product);
        setFeedback({
          card,
          error: false,
          text:
            kind === "remove"
              ? "Sale price and badge removed."
              : "Sale price saved.",
        });
      }
    } catch (error) {
      setFeedback({ card, error: true, text: message(error) });
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

  function feedbackFor(card: "visibility" | "pricing") {
    return (
      feedback?.card === card && (
        <p
          role={feedback.error ? "alert" : "status"}
          className={
            feedback.error ? "text-destructive" : "text-muted-foreground"
          }
        >
          {feedback.text}
        </p>
      )
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <SaleCard
          title="Storefront Visibility"
          description="Choose featured products and the category shown in the storefront collection."
        >
          <section className="space-y-3">
            <h3 className="font-semibold">Featured products</h3>
            <p className="text-muted-foreground">
              {products.length} available · {currentFeatured.length} currently
              featured · {featured.size} selected
            </p>
            {products.length > 0 ? (
              <>
                <Label htmlFor="featured-search">Find products</Label>
                <Input
                  id="featured-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <div className="max-h-72 divide-y overflow-y-auto rounded-lg border">
                  {matches.map((product) => (
                    <div
                      key={product.id}
                      className="flex min-h-12 items-center gap-3 px-3 py-2"
                    >
                      <Checkbox
                        id={`featured-${product.id}`}
                        checked={featured.has(product.id)}
                        disabled={
                          locked ||
                          (featured.size >= 500 && !featured.has(product.id))
                        }
                        onCheckedChange={(checked) =>
                          setFeatured((current) => {
                            const next = new Set(current);
                            if (checked) next.add(product.id);
                            else next.delete(product.id);
                            return next;
                          })
                        }
                      />
                      <Label
                        htmlFor={`featured-${product.id}`}
                        className="min-w-0 flex-1 break-words"
                      >
                        {product.name}
                        {product.brand && ` · ${product.brand}`}
                      </Label>
                      {product.isFeaturedProduct && (
                        <Badge variant="secondary">Featured</Badge>
                      )}
                    </div>
                  ))}
                  {matches.length === 0 && (
                    <p className="p-3 text-muted-foreground">
                      No matching products.
                    </p>
                  )}
                </div>
                {featured.size >= 500 && (
                  <p className="text-muted-foreground">
                    Up to 500 products can be featured.
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                Add products to the catalog to feature them here.
              </p>
            )}
          </section>
          <Separator />
          <section className="space-y-3">
            <h3 className="font-semibold">Collection category</h3>
            <p className="text-muted-foreground">
              Current category ·{" "}
              {storefront.collectionCategory
                ? catalogCategoryTitle(storefront.collectionCategory, categories)
                : "None"}
            </p>
            {storefront.collectionCategory ? (
              category === null ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-muted-foreground">
                    Save the removal before choosing another category.
                  </p>
                  <Button
                    variant="outline"
                    disabled={locked}
                    onClick={() => setCategory(storefront.collectionCategory)}
                  >
                    Undo removal
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  disabled={locked}
                  onClick={() => setCategory(null)}
                >
                  Remove category
                </Button>
              )
            ) : (
              <>
                <Label htmlFor="collection-category">Select category</Label>
                <select
                  id="collection-category"
                  className={selectClass}
                  value={category ?? ""}
                  disabled={locked}
                  onChange={(event) =>
                    setCategory(
                      event.target.value || null,
                    )
                  }
                >
                  <option value="">No category</option>
                  {categories.map(({ slug: key, title: label }) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </>
            )}
          </section>
          {feedbackFor("visibility")}
          <Button
            size="lg"
            disabled={locked || !visibilityChanged}
            onClick={() =>
              setConfirmation({
                kind: "visibility",
                title: "Save storefront visibility?",
                description: `Featured products selected: ${featured.size}. Collection category: ${category ? catalogCategoryTitle(category, categories) : "None"}.`,
              })
            }
          >
            Save visibility
          </Button>
        </SaleCard>
        <SaleCard
          title="Pricing & Discounts"
          description="Set an optional sale price and choose the badge to show with it."
        >
          <div className="space-y-2">
            <Label htmlFor="sale-product">Product</Label>
            <select
              id="sale-product"
              className={selectClass}
              value={productId}
              disabled={locked || products.length === 0}
              onChange={(event) => {
                editProduct(
                  products.find((item) => item.id === event.target.value),
                );
                setFeedback(null);
              }}
            >
              <option value="">
                {products.length
                  ? "Choose a product"
                  : "No products in the catalog"}
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.brand && ` · ${product.brand}`}
                  {product.isDiscountPrice &&
                    ` · On sale at ${usd(product.discountPrice)}`}
                </option>
              ))}
            </select>
          </div>
          {currentProduct && (
            <>
              <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3">
                <div>
                  <dt className="text-muted-foreground">Regular price</dt>
                  <dd className="font-semibold">
                    {currentProduct.price
                      ? usd(currentProduct.price)
                      : "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Current sale price</dt>
                  <dd className="font-semibold">
                    {currentProduct.isDiscountPrice
                      ? usd(currentProduct.discountPrice)
                      : "None"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Current badge</dt>
                  <dd className="font-semibold">
                    {currentProduct.saleTag || "No badge"}
                  </dd>
                </div>
              </dl>
              {!baseCents && (
                <p className="text-muted-foreground">
                  Set a positive regular price on the Products page before
                  adding a discount.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="sale-price">Sale price (USD)</Label>
                <Input
                  id="sale-price"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={price}
                  disabled={locked || !baseCents}
                  aria-invalid={Boolean(priceError)}
                  aria-describedby={priceError ? "sale-price-error" : undefined}
                  onChange={(event) => setPrice(event.target.value)}
                />
                {priceError && (
                  <p id="sale-price-error" className="text-destructive">
                    {priceError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale-badge">Sale badge</Label>
                <select
                  id="sale-badge"
                  className={selectClass}
                  value={validPrice ? badge : "none"}
                  disabled={locked || !validPrice}
                  onChange={(event) =>
                    setBadge(event.target.value as ProductDiscountBadge)
                  }
                >
                  {discountBadgeTypes.map(
                    (type) =>
                      (validPrice || type === "none") && (
                        <option key={type} value={type}>
                          {badgeLabels[type]}
                        </option>
                      ),
                  )}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="lg"
                  disabled={locked || !validPrice || !discountChanged}
                  onClick={() =>
                    setConfirmation({
                      kind: "discount",
                      title: "Save sale price?",
                      description: `Set ${currentProduct.name} to ${usd((saleCents! / 100).toFixed(2))} with the badge option “${badgeLabels[badge]}”.`,
                    })
                  }
                >
                  Save sale price
                </Button>
                {currentProduct.isDiscountPrice && (
                  <Button
                    size="lg"
                    variant="destructive"
                    disabled={locked}
                    onClick={() =>
                      setConfirmation({
                        kind: "remove",
                        title: "Remove this sale price?",
                        description: `${currentProduct.name} will return to ${usd(currentProduct.price)} and its sale badge will be cleared.`,
                      })
                    }
                  >
                    Remove sale price
                  </Button>
                )}
              </div>
            </>
          )}
          {feedbackFor("pricing")}
        </SaleCard>
      </div>
      {needsReload && (
        <Button variant="outline" disabled={Boolean(busy)} onClick={reload}>
          {busy === "reload" && <Spinner />} Reload saved settings
        </Button>
      )}
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
            <AlertDialogCancel disabled={Boolean(busy)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(busy)}
              variant={
                confirmation?.kind === "remove" ? "destructive" : "default"
              }
              onClick={save}
            >
              {busy && <Spinner />}
              {busy ? "Saving…" : "Confirm"}
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
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Storefront Merchandising
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage featured products, collections, discounts, and promotional
          badges.
        </p>
      </div>
      <Separator className="h-0.5 w-full" />
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
          className="grid gap-5 lg:grid-cols-2"
        >
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      )}
    </main>
  );
}
