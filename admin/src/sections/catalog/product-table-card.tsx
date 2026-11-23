"use client";

import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  useTable,
  tableFeatures,
  globalFilteringFeature,
  columnFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFns,
  filterFns,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import ProductEditor from "@/sections/catalog/catalog-product-editor";

import {
  catalogCategoryTitle,
  catalogPageSizes,
  type CatalogProduct,
  type CatalogCategory,
} from "@/data/catalog-data";


import { CatalogTableEmptyRow, CatalogTableSearch } from "./catalog-table-controls";

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns,
  filterFns,
});

const compactColumnIds = new Set([
  "select",
  "serial",
  "category",
  "price",
  "leads",
  "createdAt",
  "actions",
]);

export default function ProductTableCard({ categories, adding, closeAdd, refreshKey, onChanged }: {
  categories: CatalogCategory[];
  adding: boolean;
  closeAdd: () => void;
  refreshKey: number;
  onChanged: () => void;
}) {
  "use no memo";
  const [productCount, setProductCount] = useState(0);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: catalogPageSizes.products,
  });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/catalog/products", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 401) {
          window.location.replace("/");
          return;
        }
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error?.message ?? "Unable to load products.");
        setProducts(result.products);
        if (!result.products.length) setQuery("");
        setProductCount(result.total);
        setLoaded(true);
        setTruncated(result.truncated);
        setPagination((current) => ({
          ...current,
          pageIndex: Math.min(
            current.pageIndex,
            Math.max(
              0,
              Math.ceil(result.products.length / current.pageSize) - 1,
            ),
          ),
        }));
      } catch (cause) {
        if (!controller.signal.aborted) {
          const message =
            cause instanceof Error ? cause.message : "Unable to load products.";
          if (reload > 0) toast.error(message);
          setError(message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [reload, refreshKey]);
  const [category, setCategory] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const [editor, setEditor] = useState<{
    product: CatalogProduct | null;
  } | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<CatalogProduct[]>([]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const columns = useMemo<ColumnDef<typeof features, CatalogProduct>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => {
          const pageRows = table.getRowModel().rows;
          const allSelected =
            pageRows.length > 0 &&
            pageRows.every((row) => selectedIdSet.has(row.original.id));
          return (
            <span className="flex size-full items-center justify-center">
              <Checkbox
                className="shrink-0"
                checked={allSelected}
                disabled={loading || pageRows.length === 0}
                onCheckedChange={(checked) => {
                  const pageIds = pageRows.map((row) => row.original.id);
                  setSelectedIds((current) => {
                    const next = new Set(current);
                    pageIds.forEach((id) => {
                      if (checked) next.add(id);
                      else next.delete(id);
                    });
                    return [...next];
                  });
                }}
                aria-label="Select products on this page"
              />
            </span>
          );
        },
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex size-full items-center justify-center">
            <Checkbox
              className="shrink-0"
              checked={selectedIdSet.has(row.original.id)}
              onCheckedChange={(checked) => {
                setSelectedIds((current) => {
                  const next = new Set(current);
                  if (checked) next.add(row.original.id);
                  else next.delete(row.original.id);
                  return [...next];
                });
              }}
              aria-label={`Select ${row.original.name}`}
            />
          </span>
        ),
      },
      {
        id: "serial",
        header: "S. No.",
        enableSorting: false,
        cell: ({ row, table }) => (
          <span className="tabular-nums text-muted-foreground">
            {table
              .getSortedRowModel()
              .rows.findIndex((item) => item.id === row.id) + 1}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <div className="flex min-w-0 w-full items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
              {row.original.images[0] ? (
                <Image
                  src={row.original.images[0].url}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  className="size-full object-contain"
                />
              ) : (
                <Package
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-medium text-heading" title={row.original.name}>
                {row.original.name}
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {row.original.brand || "Brand not entered"}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <span className="block truncate text-sm" title={catalogCategoryTitle(row.original.category, categories)}>
            {catalogCategoryTitle(row.original.category, categories)}
          </span>
        ),
      },
      {
        id: "price",
        accessorFn: (product) =>
          product.price === "" ? undefined : Number(product.price),
        header: "Price",
        cell: ({ getValue }) =>
          getValue() === undefined ? (
            <span className="text-muted-foreground">Not set</span>
          ) : (
            <span className="whitespace-nowrap tabular-nums">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(Number(getValue()))}
            </span>
          ),
      },
      {
        accessorKey: "leads",
        header: "Leads",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.leads}</span>
        ),
      },
      {
        id: "createdAt",
        accessorFn: (product) =>
          product.createdAt ? Date.parse(product.createdAt) : 0,
        header: "Date added",
        cell: ({ row }) => {
          const createdAt = row.original.createdAt;

          if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
            return <span className="text-muted-foreground">—</span>;
          }

          return (
            <span className="whitespace-nowrap text-sm tabular-nums">
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }).format(new Date(createdAt))}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-1">
            <Button
              type="button"
              variant="ghost"
              className="size-10 shrink-0 rounded-none border border-border bg-white hover:bg-[#ffce00] hover:text-heading"
              style={{ boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px" }}
              aria-label={`Edit ${row.original.name}`}
              onClick={() => setEditor({ product: row.original })}
            >
              <Pencil
                className="size-4 shrink-0"
                aria-hidden="true"
                strokeWidth={2}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="size-10 shrink-0 rounded-none border border-border bg-white text-destructive hover:bg-red-500 hover:text-primary-foreground"
              style={{ boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px" }}
              aria-label={`Delete ${row.original.name}`}
              onClick={() => setDeleteTargets([row.original])}
            >
              <Trash2
                className="size-4 shrink-0"
                aria-hidden="true"
                strokeWidth={2}
              />
            </Button>
          </div>
        ),
      },
    ],
    [selectedIdSet, categories, loading],
  );
  const categoryOptions = [...new Set([...categories.map((item) => item.slug), ...products.map((item) => item.category)])];
  const activeCategory = categories.length > 0 && categoryOptions.includes(category) ? category : "";
  const data = useMemo(
    () =>
      products.filter(
        (product) => activeCategory === "" || product.category === activeCategory,
      ),
    [products, activeCategory],
  );
  const table = useTable({
    features,
    data,
    columns,
    state: { sorting, globalFilter: query, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setQuery,
    onPaginationChange: setPagination,
    getRowId: (row) => row.id,
    globalFilterFn: (row, _column, value) =>
      `${row.original.name} ${row.original.brand}`
        .toLowerCase()
        .includes(String(value).toLowerCase()),
    autoResetPageIndex: false,
  });
  function resetPage() {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }
  async function save(product: CatalogProduct) {
    const existing = products.some((item) => item.id === product.id);
    const {
      id,
      leads: ignoredLeads,
      featuredProduct: ignoredFeaturedProduct,
      discountPrice: ignoredDiscountPrice,
      discountBadge: ignoredDiscountBadge,
      ...payload
    } = product;
    void ignoredLeads;
    void ignoredFeaturedProduct;
    void ignoredDiscountPrice;
    void ignoredDiscountBadge;
    delete payload.createdAt;
    delete payload.updatedAt;
    const response = await fetch(
      existing ? "/api/catalog/products/" + id : "/api/catalog/products",
      {
        method: existing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (response.status === 401) {
      window.location.replace("/");
      throw new Error("Please sign in again.");
    }
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error?.message ?? "Unable to save product.");
    setProducts((current) =>
      existing
        ? current.map((item) => (item.id === id ? result.product : item))
        : [result.product, ...current],
    );
    setEditor(null);
    closeAdd();
    if (!existing) setProductCount((count) => count + 1);
    onChanged();
    resetPage();
    setReload((value) => value + 1);
    toast.success(existing ? "Product updated." : "Product created.");
  }
  const selectedProducts = useMemo(
    () => products.filter((product) => selectedIdSet.has(product.id)),
    [products, selectedIdSet],
  );
  async function removeProducts() {
    if (!deleteTargets.length || deletingBusy) return;
    setDeletingBusy(true);
    try {
      const deletingMultiple = deleteTargets.length > 1;
      const response = await fetch(
        deletingMultiple
          ? "/api/catalog/products/bulk"
          : "/api/catalog/products/" + deleteTargets[0].id,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            deletingMultiple
              ? {
                  products: deleteTargets.map(({ id, version }) => ({
                    id,
                    version,
                  })),
                }
              : { version: deleteTargets[0].version },
          ),
        },
      );
      if (response.status === 401) {
        window.location.replace("/");
        return;
      }
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message ?? "Unable to delete product.");
      }
      const deletedIds = new Set(deleteTargets.map((product) => product.id));
      setProducts((current) =>
        current.filter((item) => !deletedIds.has(item.id)),
      );
      setSelectedIds((current) => current.filter((id) => !deletedIds.has(id)));
      setDeleteTargets([]);
      setProductCount((count) => count - deletedIds.size);
      onChanged();
      resetPage();
      setReload((value) => value + 1);
      toast.success(
        deleteTargets.length === 1 ? "Product deleted." : "Products deleted.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Unable to delete product.",
      );
    } finally {
      setDeletingBusy(false);
    }
  }
  const total = table.getFilteredRowModel().rows.length;
  const productRows = table.getRowModel().rows;
  const emptyTableRows = Math.max(0, pagination.pageSize - productRows.length);
  return (
    <>
      {truncated && (
        <p className="text-sm text-muted-foreground">
          Showing the first 500 products. Server pagination will be required
          before expanding beyond this catalog limit.
        </p>
      )}
      {error && !loaded ? (
        <div role="alert" className="rounded-xl border bg-card p-8 text-center">
          <p>{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => setReload((current) => current + 1)}
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          <Card className="mt-2 gap-0 overflow-hidden py-0 md:mt-3">
            <CardContent className="@container p-0">
              <div className="space-y-3 border-b p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-start gap-2 text-xl font-semibold">
                    Products Table <Badge aria-label={`${productCount} total products`} className="bg-primary text-primary-foreground">{productCount}</Badge>
                  </h2>
                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                    <Button
                      type="button"
                      className="h-11 w-full gap-2 rounded-none sm:w-auto bg-red-500 text-white shadow-sm hover:bg-red-600 hover:text-white"
                      style={{
                        boxShadow:
                          "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
                      }}
                      disabled={!selectedProducts.length || deletingBusy}
                      onClick={() => setDeleteTargets(selectedProducts)}
                    >
                      <Trash2
                        className="size-4 shrink-0"
                        aria-hidden="true"
                        strokeWidth={2}
                      />
                      Delete selected
                      {selectedProducts.length
                        ? ` (${selectedProducts.length})`
                        : ""}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full gap-2 rounded-none sm:w-auto"
                      style={{
                        boxShadow:
                          "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
                      }}
                      disabled={loading}
                      aria-busy={loading}
                      onClick={() => setReload((current) => current + 1)}
                    >
                      {loading ? (
                        <>
                          Refreshing
                          <Spinner aria-hidden="true" />
                        </>
                      ) : (
                        <>
                          <RefreshCw
                            className="size-4 shrink-0"
                            aria-hidden="true"
                            strokeWidth={2}
                          />
                          Refresh
                        </>
                      )}
                    </Button>
                    <select
                      aria-label="Filter by category"
                      disabled={categories.length === 0}
                      value={activeCategory}
                      onChange={(event) => {
                        setCategory(event.target.value);
                        resetPage();
                      }}
                      className="h-11 w-full min-w-0 rounded-none border bg-card px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:max-w-60"
                    >
                      <option value="">All categories</option>
                      {categoryOptions.map((value) => (
                        <option key={value} value={value}>
                          {catalogCategoryTitle(value, categories)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <CatalogTableSearch label="Search products" placeholder="Search products or brand..." value={query}
                  disabled={products.length === 0}
                  onChange={(value) => { setQuery(value); resetPage(); }} />
              </div>
              <div>
                <Table className="min-w-[58rem] table-fixed">
                  <colgroup>
                    <col className="w-12" />
                    <col className="w-[4.5rem]" />
                    <col />
                    <col className="w-32" />
                    <col className="w-24" />
                    <col className="w-24" />
                    <col className="w-36" />
                    <col className="w-[7.5rem]" />
                  </colgroup>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    {table.getHeaderGroups().map((group) => (
                      <TableRow
                        key={group.id}
                        className="border-b border-border"
                      >
                        {group.headers.map((header) => {
                          const isSelect = header.column.id === "select";
                          const isCompact = compactColumnIds.has(
                            header.column.id,
                          );

                          return (
                            <TableHead
                              key={header.id}
                              className={`h-12 border-y border-r border-border bg-muted/40 px-4 whitespace-nowrap last:border-r-0 ${
                                isSelect
                                  ? "w-12 !p-0 text-center"
                                  : isCompact
                                    ? "text-center"
                                    : ""
                              }`}
                            >
                              {header.column.getCanSort() ? (
                                <button
                                  type="button"
                                  onClick={header.column.getToggleSortingHandler()}
                                  className={`inline-flex min-h-11 items-center gap-2 font-medium ${
                                    isCompact ? "w-full justify-center" : ""
                                  }`}
                                  aria-label={`Sort by ${String(header.column.columnDef.header)}`}
                                >
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )}
                                  {header.column.getIsSorted() === "asc" ? (
                                    <ArrowUp className="size-3.5 shrink-0" />
                                  ) : header.column.getIsSorted() === "desc" ? (
                                    <ArrowDown className="size-3.5 shrink-0" />
                                  ) : (
                                    <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                                  )}
                                </button>
                              ) : (
                                flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )
                              )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody
                    aria-busy={loading}
                    className="[&_tr:last-child]:border-b"
                  >
                    {loading ? (
                      Array.from({ length: pagination.pageSize }, (_, index) => (
                        <TableRow
                          key={`refresh-${index}`}
                          className="h-20 border-b border-border"
                        >
                          {columns.map((column, cellIndex) => (
                            <TableCell
                              key={cellIndex}
                              className={`border-r border-border px-4 py-3 last:border-r-0 ${
                                column.id === "select"
                                  ? "w-12 !p-0 text-center"
                                  : compactColumnIds.has(column.id ?? "")
                                    ? "text-center"
                                    : ""
                              }`}
                            >
                              <Skeleton
                                className={
                                  cellIndex === 2
                                    ? "h-12 w-full"
                                    : "mx-auto h-5 w-full max-w-16"
                                }
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : productRows.length ? (
                      <>
                        {productRows.map((row) => (
                          <TableRow
                            key={row.id}
                            className="h-20 border-b border-border"
                          >
                            {row.getAllCells().map((cell) => (
                              <TableCell
                                key={cell.id}
                                className={`border-r border-border px-4 py-3 last:border-r-0 ${
                                  cell.column.id === "select"
                                    ? "w-12 !p-0 text-center"
                                    : compactColumnIds.has(cell.column.id)
                                      ? "text-center"
                                      : ""
                                }`}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                        {Array.from({ length: emptyTableRows }, (_, index) => (
                          <TableRow
                            key={`empty-row-${index}`}
                            aria-hidden="true"
                            className="h-20 border-b border-border"
                          >
                            {columns.map((column, cellIndex) => (
                              <TableCell
                                key={cellIndex}
                                className={`border-r border-border px-4 py-3 last:border-r-0 ${
                                  column.id === "select"
                                    ? "w-12 !p-0 text-center"
                                    : compactColumnIds.has(column.id ?? "")
                                      ? "text-center"
                                      : ""
                                }`}
                              />
                            ))}
                          </TableRow>
                        ))}
                      </>
                    ) : (
                      <CatalogTableEmptyRow columns={columns.length} rows={pagination.pageSize} icon={Package}
                        title={products.length ? "No products found" : "No products yet"}
                        description={products.length
                          ? "Try another search or clear your filters."
                          : categories.length
                            ? "Use Add Product to create your first product."
                            : "Add a category first, then create your first product."} />
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-4 border-t border-border px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <span className="text-muted-foreground" role="status">
                  {total} {total === 1 ? "product" : "products"}
                </span>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">
                    {pagination.pageIndex + 1} /{" "}
                    {Math.max(1, table.getPageCount())}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    className="size-10 shrink-0 rounded-none"
                    style={{
                      boxShadow:
                        "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
                    }}
                    aria-label="Previous page"
                    disabled={!table.getCanPreviousPage()}
                    onClick={() => table.previousPage()}
                  >
                    <ChevronLeft className="size-4 shrink-0" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="size-10 shrink-0 rounded-none"
                    style={{
                      boxShadow:
                        "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
                    }}
                    aria-label="Next page"
                    disabled={!table.getCanNextPage()}
                    onClick={() => table.nextPage()}
                  >
                    <ChevronRight className="size-4 shrink-0" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      {(editor || adding) && (
        <ProductEditor
          product={editor?.product ?? null}
          categories={categories}
          onClose={() => { setEditor(null); closeAdd(); }}
          onSave={save}
        />
      )}
      <AlertDialog
        open={deleteTargets.length > 0}
        onOpenChange={(open) => {
          if (!open && !deletingBusy) setDeleteTargets([]);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            Delete{" "}
            {deleteTargets.length === 1
              ? "product"
              : `${deleteTargets.length} products`}
            ?
          </AlertDialogTitle>

          <AlertDialogDescription>
            {deleteTargets.length === 1
              ? `"${deleteTargets[0]?.name}" and its variants and images will be permanently deleted.`
              : `The selected products and their variants and images will be permanently deleted.`}{" "}
            This cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deletingBusy}
              className="h-11 rounded-none"
              style={{
                boxShadow:
                  "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
              }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="h-11 rounded-none bg-red-500 shadow-sm hover:bg-red-600 text-primary-foreground hover:text-primary-foreground"
              style={{
                boxShadow:
                  "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
              }}
              disabled={deletingBusy}
              onClick={() => void removeProducts()}
            >
              {deletingBusy ? (
                <>
                  Deleting
                  <Spinner aria-hidden="true" />
                </>
              ) : deleteTargets.length === 1 ? (
                "Delete product"
              ) : (
                "Delete products"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
