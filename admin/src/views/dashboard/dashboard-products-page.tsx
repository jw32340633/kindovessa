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
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import ProductsTableSkeleton from "@/components/shared/products-table-skeleton";
import ProductEditor from "@/components/products/product-editor";
import {
  categoryLabels,
  ProductCategory,
  type CatalogProduct,
} from "@/data/products-data";

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

export default function DashboardProductsPage() {
  "use no memo";
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/products", {
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
  }, [reload]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
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
          <div className="flex min-w-64 items-center gap-3">
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
            <div className="min-w-0">
              <span className="block max-w-80 truncate font-medium text-heading">
                {row.original.name}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
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
          <span className="whitespace-nowrap text-sm">
            {categoryLabels[row.original.category]}
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
    [selectedIdSet],
  );
  const data = useMemo(
    () =>
      products.filter(
        (product) => category === "all" || product.category === category,
      ),
    [products, category],
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
      existing ? "/api/products/" + id : "/api/products",
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
    resetPage();
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
          ? "/api/products/bulk"
          : "/api/products/" + deleteTargets[0].id,
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
      resetPage();
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
  const emptyTableRows = Math.max(0, 10 - productRows.length);
  return (
    <main className="dashboard-layout">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Product Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your catalog, variants, images, and product information.
          </p>
        </div>
        <Button
          type="button"
          style={{
            boxShadow:
              "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px",
          }}
          disabled={!loaded && (loading || !!error)}
          className="h-12 gap-2 rounded-none px-6 text-sm font-semibold"
          onClick={() => setEditor({ product: null })}
        >
          <Plus className="size-4 shrink-0" aria-hidden="true" />
          Add Product
        </Button>
      </div>
      <Separator className={"w-full h-0.5"} />
      {truncated && (
        <p className="text-sm text-muted-foreground">
          Showing the first 500 products. Server pagination will be required
          before expanding beyond this catalog limit.
        </p>
      )}
      {loading && !loaded ? (
        <ProductsTableSkeleton />
      ) : error && !loaded ? (
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
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center xl:justify-between sm:p-5">
                <div className="relative w-full xl:max-w-sm">
                  <Search
                    className="absolute top-3.5 left-3 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    aria-label="Search products by name or brand"
                    placeholder="Search products or brand..."
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      resetPage();
                    }}
                    className="h-11 pl-10 rounded-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    className="h-11 shrink-0 gap-2 rounded-none bg-red-500 text-white shadow-sm hover:bg-red-600 hover:text-white"
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
                    className="h-11 shrink-0 gap-2 rounded-none"
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
                    value={category}
                    onChange={(event) => {
                      setCategory(event.target.value);
                      resetPage();
                    }}
                    className="h-11 min-w-0 flex-1 rounded-none border bg-card px-3 text-sm sm:flex-none"
                  >
                    <option value="all">All categories</option>
                    {Object.values(ProductCategory).map((value) => (
                      <option key={value} value={value}>
                        {categoryLabels[value]}
                      </option>
                    ))}
                  </select>
                  {(query || category !== "all") && (
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-11 gap-1"
                      onClick={() => {
                        setQuery("");
                        setCategory("all");
                        resetPage();
                      }}
                    >
                      <X aria-hidden="true" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Table>
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
                                    ? "w-px text-center"
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
                      Array.from({ length: 10 }, (_, index) => (
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
                                    ? "w-px text-center"
                                    : ""
                              }`}
                            >
                              <Skeleton
                                className={
                                  cellIndex === 2
                                    ? "h-12 w-56"
                                    : "mx-auto h-5 w-16"
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
                                      ? "w-px text-center"
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
                                      ? "w-px text-center"
                                      : ""
                                }`}
                              />
                            ))}
                          </TableRow>
                        ))}
                      </>
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-56 text-center"
                        >
                          <Package className="mx-auto mb-3 size-8 shrink-0 text-muted-foreground" />
                          <p className="font-medium">
                            {products.length
                              ? "No products found"
                              : "Your catalog is empty"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {products.length
                              ? "Try another search or clear your filters."
                              : "Use Add Product to create your first product."}
                          </p>
                        </TableCell>
                      </TableRow>
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
      {editor && (
        <ProductEditor
          product={editor.product}
          onClose={() => setEditor(null)}
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
    </main>
  );
}
