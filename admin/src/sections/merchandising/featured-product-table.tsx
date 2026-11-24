"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Package, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { catalogPageSizes } from "@/data/catalog-data";
import { CatalogTableEmptyRow, CatalogTableSearch } from "@/sections/catalog/catalog-table-controls";
import { catalogButtonShadow } from "@/sections/catalog/catalog-table-controls";

import { categoryTitles, type Category } from "@/data/enum";

type FeaturedProduct = { id: string; name: string; brand: string; category: Category; imageUrl: string | null; isFeaturedProduct: boolean };
const cell = "border-r border-border px-4 py-3 last:border-r-0";
const head = "h-12 border-y border-r border-border bg-muted/40 px-4 last:border-r-0";
const pageSize = catalogPageSizes.featured;
export const featuredProductLimit = 500;
const shadow = { boxShadow: catalogButtonShadow };

export function ProductSummary({ product, caption }: { product: Pick<FeaturedProduct, "name" | "imageUrl">; caption: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
        {product.imageUrl
          ? <Image src={product.imageUrl} width={48} height={48} unoptimized alt="" className="size-full object-contain" />
          : <Package className="size-5 text-muted-foreground" aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block truncate font-medium text-heading" title={product.name}>{product.name}</span>
        {caption && <span className="mt-1 block truncate text-xs text-muted-foreground">{caption}</span>}
      </div>
    </div>
  );
}

export default function FeaturedProductTable({ products, locked, adding, closeAdd, refresh, onChange }: {
  products: FeaturedProduct[];
  locked: boolean;
  adding: boolean;
  closeAdd: () => void;
  refresh: React.ReactNode;
  onChange: (ids: string[], action: "add" | "remove", count: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [desc, setDesc] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [addQuery, setAddQuery] = useState("");
  const [addIds, setAddIds] = useState<string[]>([]);
  const featured = products.filter((product) => product.isFeaturedProduct);
  const available = products.filter((product) => !product.isFeaturedProduct);
  const capacity = Math.max(0, featuredProductLimit - featured.length);
  const categoryTitle = (product: FeaturedProduct) => categoryTitles[product.category];
  const matches = (product: FeaturedProduct, value: string) =>
    `${product.name} ${product.brand} ${categoryTitle(product)}`.toLowerCase().includes(value.trim().toLowerCase());
  const filtered = featured.filter((product) => matches(product, query)).sort((a, b) =>
    (desc ? -1 : 1) * a.name.localeCompare(b.name));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visiblePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize);
  const allSelected = rows.length > 0 && rows.every(({ id }) => selected.includes(id));
  const selectedIds = featured.filter(({ id }) => selected.includes(id)).map(({ id }) => id);
  const pendingIds = available.filter(({ id }) => addIds.includes(id)).map(({ id }) => id);

  function remove(ids: string[]) {
    onChange(featured.filter(({ id }) => !ids.includes(id)).map(({ id }) => id), "remove", ids.length);
  }

  function closePicker() {
    setAddQuery("");
    setAddIds([]);
    closeAdd();
  }

  return (
    <>
      <Card className="mt-2 gap-0 overflow-hidden py-0 md:mt-3">
        <CardContent className="@container p-0">
          <div className="space-y-3 border-b p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-start gap-2 text-xl font-semibold">
                Featured Product Table <Badge aria-label={`${featured.length} featured products`} className="bg-primary text-primary-foreground">{featured.length}</Badge>
              </h2>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
                <Button className="h-11 rounded-none bg-red-500 text-white hover:bg-red-600" style={shadow}
                  disabled={locked || selectedIds.length === 0} onClick={() => remove(selectedIds)}>
                  <Trash2 aria-hidden="true" /> Delete selected{selectedIds.length ? ` (${selectedIds.length})` : ""}
                </Button>
                {refresh}
              </div>
            </div>
            <CatalogTableSearch label="Search featured products" placeholder="Search featured products..." value={query}
              disabled={!featured.length} onChange={(value) => { setQuery(value); setPage(0); }} />
          </div>
          <Table className="min-w-[25rem] table-fixed" aria-label="Featured products">
            <colgroup><col className="w-12" /><col className="w-[4.5rem]" /><col /><col className="w-24" /></colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className={`${head} !p-0 text-center`}>
                  <Checkbox className="mx-auto" aria-label="Select featured products on this page" checked={allSelected}
                    indeterminate={!allSelected && rows.some(({ id }) => selected.includes(id))} disabled={locked || !rows.length}
                    onCheckedChange={(checked) => setSelected((current) => checked
                      ? [...new Set([...current, ...rows.map(({ id }) => id)])]
                      : current.filter((id) => !rows.some((row) => row.id === id)))} />
                </TableHead>
                <TableHead className={`${head} text-center`}>S. No.</TableHead>
                <TableHead className={head} aria-sort={desc ? "descending" : "ascending"}>
                  <button type="button" className="inline-flex min-h-11 items-center gap-2" onClick={() => { setDesc(!desc); setPage(0); }}>
                    Product {desc ? <ArrowDown className="size-3.5" aria-hidden="true" /> : <ArrowUp className="size-3.5" aria-hidden="true" />}
                  </button>
                </TableHead>
                <TableHead className={`${head} text-center`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-b">
              {rows.map((product, index) => (
                <TableRow key={product.id} className="h-20">
                  <TableCell className={`${cell} !p-0 text-center`}>
                    <Checkbox className="mx-auto" aria-label={`Select ${product.name}`} checked={selected.includes(product.id)} disabled={locked}
                      onCheckedChange={(checked) => setSelected((current) => checked ? [...current, product.id] : current.filter((id) => id !== product.id))} />
                  </TableCell>
                  <TableCell className={`${cell} text-center tabular-nums text-muted-foreground`}>{visiblePage * pageSize + index + 1}</TableCell>
                  <TableCell className={cell}><ProductSummary product={product} caption={product.brand} /></TableCell>
                  <TableCell className={`${cell} text-center`}>
                    <Button variant="ghost" className="size-10 rounded-none border bg-white text-destructive shadow-md hover:bg-red-500 hover:text-white"
                      aria-label={`Remove ${product.name} from featured products`} disabled={locked} onClick={() => remove([product.id])}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length ? Array.from({ length: pageSize - rows.length }, (_, index) => (
                <TableRow key={index} aria-hidden="true" className="h-20">
                  {Array.from({ length: 4 }, (_, column) => <TableCell key={column} className={cell} />)}
                </TableRow>
              )) : <CatalogTableEmptyRow columns={4} rows={pageSize} icon={Package}
                title={featured.length ? "No featured products found" : "No featured products yet"}
                description={featured.length ? "Try another search or clear the search box." : products.length ? "Use Add Featured Product to choose products." : "Add products to the catalog first."} />}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between gap-3 border-t p-4 text-sm sm:p-5">
            <span className="text-muted-foreground">{filtered.length} featured {filtered.length === 1 ? "product" : "products"}</span>
            <div className="flex items-center gap-3">
              <span className="tabular-nums">{visiblePage + 1} / {pageCount}</span>
              <Button variant="outline" className="size-10 rounded-none" style={shadow} aria-label="Previous featured products page"
                disabled={visiblePage === 0} onClick={() => setPage(visiblePage - 1)}><ChevronLeft aria-hidden="true" /></Button>
              <Button variant="outline" className="size-10 rounded-none" style={shadow} aria-label="Next featured products page"
                disabled={visiblePage + 1 >= pageCount} onClick={() => setPage(visiblePage + 1)}><ChevronRight aria-hidden="true" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={adding} onOpenChange={(open) => { if (!open) closePicker(); }}>
        <DialogContent className="max-h-[90dvh] grid-rows-[auto_auto_auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-xl">
          <DialogTitle className="text-xl font-semibold">Add Featured Products</DialogTitle>
          <DialogDescription>Choose products to show in the storefront’s featured section.</DialogDescription>
          <CatalogTableSearch label="Search available products" placeholder="Search by product, brand, or category..." value={addQuery}
            disabled={!available.length} fullWidth onChange={setAddQuery} />
          <div className="h-[calc(var(--spacing)*80+2px)] max-h-full min-h-0 divide-y overflow-y-auto border">
            {available.filter((product) => matches(product, addQuery)).map((product) => (
              <div key={product.id} className="flex h-16 items-center gap-3 px-3">
                <Checkbox aria-label={`Feature ${product.name}`} checked={addIds.includes(product.id)}
                  disabled={locked || (pendingIds.length >= capacity && !addIds.includes(product.id))}
                  onCheckedChange={(checked) => setAddIds((current) => checked ? [...current, product.id] : current.filter((id) => id !== product.id))} />
                <div className="min-w-0 flex-1">
                  <ProductSummary product={product} caption={categoryTitle(product)} />
                </div>
              </div>
            ))}
            {!available.some((product) => matches(product, addQuery)) && <p className="p-4 text-muted-foreground">No available products match your search.</p>}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
            <span className="mr-auto text-muted-foreground">{pendingIds.length} selected{pendingIds.length === capacity ? " · Limit reached" : ""}</span>
            <Button variant="outline" className="h-11 rounded-none" style={shadow} onClick={closePicker}>Cancel</Button>
            <Button className="h-11 rounded-none" style={shadow} disabled={locked || !pendingIds.length || pendingIds.length > capacity}
              onClick={() => { closePicker(); onChange([...featured.map(({ id }) => id), ...pendingIds], "add", pendingIds.length); }}>Add selected</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
