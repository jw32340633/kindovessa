"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Package, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { catalogPageSizes, discountBadgeTypes, type ProductDiscountBadge } from "@/data/catalog-data";
import { catalogButtonShadow } from "@/sections/catalog/category-table-card";
import { CatalogTableEmptyRow, CatalogTableSearch } from "@/sections/catalog/catalog-table-controls";
import { ProductSummary } from "./featured-product-table";

type PricingProduct = {
  id: string;
  version: number;
  name: string;
  brand: string;
  imageUrl: string | null;
  price: string;
  discountPrice: string;
  discountBadge: ProductDiscountBadge;
  isDiscountPrice: boolean;
};

export type DiscountChange = {
  product: PricingProduct;
  price: string;
  badge: ProductDiscountBadge;
  badgeLabel: string;
};

const pageSize = catalogPageSizes.products;
const cell = "border-r border-border px-4 py-3 last:border-r-0";
const head = "h-12 border-y border-r border-border bg-muted/40 px-4 last:border-r-0";
const shadow = { boxShadow: catalogButtonShadow };

function cents(value: string) {
  if (!/^(?:0|[1-9]\d{0,6})(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function PricingRow({ product, locked, onSave }: {
  product: PricingProduct;
  locked: boolean;
  onSave: (change: DiscountChange) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(product.isDiscountPrice ? product.discountPrice : "");
  const [badge, setBadge] = useState(product.discountBadge);
  const enabled = editing || product.isDiscountPrice;
  const regular = cents(product.price) ?? 0;
  const discount = cents(price);
  const valid = discount !== null && discount > 0 && discount < regular;
  const savings = valid ? regular - discount : 0;
  const percent = valid && savings * 100 >= regular ? Math.floor(savings * 100 / regular) : "<1";
  const labels: Record<ProductDiscountBadge, string> = {
    none: "No badge",
    "percent-off": `${percent}% OFF`,
    "save-amount": `SAVE $${(savings / 100).toFixed(2)}`,
    "now-price": `NOW $${((discount ?? 0) / 100).toFixed(2)}`,
    "flat-percent-off": `FLAT ${percent}% OFF`,
  };
  const changed = discount !== cents(product.discountPrice) || badge !== product.discountBadge;
  const error = price && !valid
    ? discount === null || discount === 0 ? "Enter a positive USD price." : "Enter a price below the regular price."
    : "";
  const errorId = `discount-error-${product.id}`;

  return (
    <TableRow className="h-20">
      <TableCell className={`${cell} text-center`}>
        <button type="button" role="switch" aria-checked={enabled} aria-label={`Discount for ${product.name}`}
          title={!regular ? "Set a positive regular price in Catalog first." : undefined}
          disabled={locked || (!regular && !product.isDiscountPrice)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 ${enabled ? "bg-black" : "bg-muted-foreground/30"}`}
          onClick={() => {
            if (product.isDiscountPrice) onSave({ product, price: "0", badge: "none", badgeLabel: labels.none });
            else setEditing(!editing);
          }}>
          <span className={`absolute left-0.5 size-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-4" : ""}`} />
        </button>
      </TableCell>
      <TableCell className={cell}><ProductSummary product={product} caption={product.brand} /></TableCell>
      <TableCell className={`${cell} text-center tabular-nums`}>{product.price ? `$${product.price}` : "Not set"}</TableCell>
      <TableCell className={`${cell} relative`}>
        {enabled ? (
          <>
            <Input aria-label={`Discount price for ${product.name}`} inputMode="decimal" placeholder="0.00" value={price}
              disabled={locked} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}
              className="h-10 rounded-none" onChange={(event) => setPrice(event.target.value)} />
            {error && <p id={errorId} className="absolute top-[calc(50%+1.25rem)] left-4 text-xs text-destructive">{error}</p>}
          </>
        ) : <span className="text-muted-foreground">Disabled</span>}
      </TableCell>
      <TableCell className={cell}>
        {enabled ? <select aria-label={`Sale badge for ${product.name}`} value={badge} disabled={locked || !valid}
          className="h-10 w-full rounded-none border border-input bg-background px-2 text-sm disabled:opacity-50"
          onChange={(event) => setBadge(event.target.value as ProductDiscountBadge)}>
          {discountBadgeTypes.map((type) => <option key={type} value={type}>{labels[type]}</option>)}
        </select> : <span className="text-muted-foreground">Disabled</span>}
      </TableCell>
      <TableCell className={`${cell} text-center`}>
        {enabled ? <Button type="button" className="h-10 rounded-none bg-black text-white hover:bg-black/85 hover:text-white" style={shadow} disabled={locked || !valid || !changed}
          onClick={() => { if (valid) onSave({ product, price: (discount / 100).toFixed(2), badge, badgeLabel: labels[badge] }); }}>
          Save
        </Button> : (
          <Button type="button" variant="outline" size="icon" className="size-10 rounded-none text-muted-foreground"
            disabled aria-label={`Save discount for ${product.name}`}>
            <Save aria-hidden="true" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function PricingDiscountsTable({ products, locked, refresh, onSave }: {
  products: PricingProduct[];
  locked: boolean;
  refresh: ReactNode;
  onSave: (change: DiscountChange) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const filtered = products.filter(({ name, brand }) => `${name} ${brand}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visiblePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize);

  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0">
      <CardContent className="@container p-0">
        <div className="space-y-3 border-b p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-start gap-2 text-xl font-semibold">
              Pricing &amp; Discounts <Badge aria-label={`${products.length} products`} className="bg-primary text-primary-foreground">{products.length}</Badge>
            </h2>
            {refresh}
          </div>
          <CatalogTableSearch label="Search pricing products" placeholder="Search products or brand..." value={query}
            disabled={!products.length} onChange={(value) => { setQuery(value); setPage(0); }} />
        </div>
        <Table className="min-w-[59rem] table-fixed" aria-label="Pricing and discounts">
          <colgroup><col className="w-24" /><col /><col className="w-24" /><col className="w-56" /><col className="w-44" /><col className="w-24" /></colgroup>
          <TableHeader>
            <TableRow>
              {["Discount", "Product", "Price", "Discount price", "Badge", "Actions"].map((label, index) => (
                <TableHead key={label} className={`${head} ${[0, 2, 5].includes(index) ? "text-center" : ""}`}>{label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="[&_tr:last-child]:border-b">
            {rows.map((product) => <PricingRow key={`${product.id}:${product.version}`} product={product} locked={locked} onSave={onSave} />)}
            {rows.length ? Array.from({ length: pageSize - rows.length }, (_, index) => (
              <TableRow key={index} aria-hidden="true" className="h-20">
                {Array.from({ length: 6 }, (_, column) => <TableCell key={column} className={cell} />)}
              </TableRow>
            )) : <CatalogTableEmptyRow columns={6} rows={pageSize} icon={Package}
              title={products.length ? "No products found" : "No products yet"}
              description={products.length ? "Try another search or clear the search box." : "Add products to the catalog to manage discounts."} />}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between gap-3 border-t p-4 text-sm sm:p-5">
          <span className="text-muted-foreground">{filtered.length} {filtered.length === 1 ? "product" : "products"}</span>
          <div className="flex items-center gap-3">
            <span className="tabular-nums">{visiblePage + 1} / {pageCount}</span>
            <Button variant="outline" className="size-10 rounded-none" style={shadow} aria-label="Previous pricing page"
              disabled={visiblePage === 0} onClick={() => setPage(visiblePage - 1)}><ChevronLeft aria-hidden="true" /></Button>
            <Button variant="outline" className="size-10 rounded-none" style={shadow} aria-label="Next pricing page"
              disabled={visiblePage + 1 >= pageCount} onClick={() => setPage(visiblePage + 1)}><ChevronRight aria-hidden="true" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
