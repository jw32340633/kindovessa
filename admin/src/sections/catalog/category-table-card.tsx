"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import CatalogCategoryEditor from "./catalog-category-editor";

import { catalogPageSizes, type CatalogCategory } from "@/data/catalog-data";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RefreshCw,
  Folder,
  Trash2,
} from "lucide-react";

import { CatalogTableEmptyRow, CatalogTableSearch } from "./catalog-table-controls";

export const catalogButtonShadow =
  "rgba(50, 50, 93, 0.25) 0px 2px 5px -1px, rgba(0, 0, 0, 0.3) 0px 1px 3px -1px";
const bulkButton =
  "h-11 shrink-0 gap-2 rounded-none bg-red-500 text-white hover:bg-red-600 hover:text-white";
const rowButton = "size-10 shrink-0 rounded-none border border-border bg-white";
const rowShadow = "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px";
const headClass =
  "h-12 border-y border-r border-border bg-muted/40 px-4 last:border-r-0";
const cellClass = "border-r border-border px-4 py-3 last:border-r-0";
const pageSize = catalogPageSizes.categories;
const maxDeleteCount = 100;
const sortColumns = [
  ["title", "Category"],
  ["slug", "Frontend URL"],
  ["productCount", "Products"],
  ["createdAt", "Date added"],
] as const;
type SortKey = (typeof sortColumns)[number][0];
const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

async function catalogCategoryRequest<T>(
  path = "",
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/catalog/categories${path}`, {
    cache: "no-store",
    ...options,
  });
  if (response.status === 401) window.location.replace("/");
  const result =
    response.status === 204
      ? undefined
      : await response.json().catch(() => undefined);
  if (!response.ok)
    throw new Error(
      result?.error?.message ?? "Unable to complete the category request.",
    );
  return result;
}

export default function CategoryTableCard({
  categories,
  setCategories,
  adding,
  closeAdd,
  refreshKey,
  onChanged,
}: {
  categories: CatalogCategory[];
  setCategories: (categories: CatalogCategory[]) => void;
  adding: boolean;
  closeAdd: () => void;
  refreshKey: number;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
    key: "createdAt",
    desc: true,
  });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<CatalogCategory | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<CatalogCategory[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await catalogCategoryRequest<{
          categories: CatalogCategory[];
        }>("", { signal: controller.signal });
        if (controller.signal.aborted) return;
        setCategories(result.categories);
        if (!result.categories.length) setQuery("");
        setSelected([]);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load categories.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [refreshKey, reload, setCategories]);

  const filtered = categories
    .filter(({ title, slug }) =>
      `${title} /${slug}`.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((left, right) => {
      const result =
        sort.key === "productCount"
          ? left.productCount - right.productCount
          : left[sort.key].localeCompare(right[sort.key]);
      return sort.desc ? -result : result;
    });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visiblePage = Math.min(page, pageCount - 1);
  const rows = filtered.slice(
    visiblePage * pageSize,
    (visiblePage + 1) * pageSize,
  );
  const selectedCategories = categories.filter(({ id }) =>
    selected.includes(id),
  );
  const allSelected =
    rows.length > 0 && rows.every(({ id }) => selected.includes(id));

  async function save(title: string, coverAssetId: string) {
    await catalogCategoryRequest(editing ? `/${editing.id}` : "", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, coverAssetId, version: editing?.version }),
    });
    toast.success(editing ? "Category updated." : "Category added.");
    setEditing(null);
    closeAdd();
    setPage(0);
    setReload((value) => value + 1);
    onChanged();
  }

  function confirmDelete(targets: CatalogCategory[]) {
    setDeleteError("");
    setDeleteTargets(targets);
  }

  async function removeCategories() {
    if (deleting || !deleteTargets.length) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await catalogCategoryRequest("/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: deleteTargets.map(({ id, version }) => ({ id, version })),
        }),
      });
      toast.success(
        deleteTargets.length === 1
          ? "Category deleted."
          : "Categories deleted.",
      );
      setDeleteTargets([]);
      setPage(0);
      setReload((value) => value + 1);
      onChanged();
    } catch (cause) {
      setDeleteError(
        cause instanceof Error ? cause.message : "Unable to delete categories.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="mt-2 gap-0 overflow-hidden py-0 md:mt-3">
        <CardContent className="@container p-0">
          <div className="space-y-3 border-b p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-start gap-2 text-xl font-semibold">
                Category Table{" "}
                <Badge
                  aria-label={`${categories.length} total categories`}
                  className="bg-primary text-primary-foreground"
                >
                  {categories.length}
                </Badge>
              </h2>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                <Button
                  className={`${bulkButton} w-full sm:w-auto`}
                  style={{ boxShadow: catalogButtonShadow }}
                  disabled={
                    loading ||
                    Boolean(error) ||
                    !selectedCategories.length ||
                    selectedCategories.length > maxDeleteCount ||
                    deleting
                  }
                  onClick={() => confirmDelete(selectedCategories)}
                >
                  <Trash2 aria-hidden="true" /> Delete selected
                  {selectedCategories.length
                    ? ` (${selectedCategories.length})`
                    : ""}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-none sm:w-auto"
                  style={{ boxShadow: catalogButtonShadow }}
                  disabled={loading}
                  onClick={() => setReload((value) => value + 1)}
                >
                  {loading ? (
                    <>
                      <Spinner aria-hidden="true" /> Refreshing
                    </>
                  ) : (
                    <>
                      <RefreshCw aria-hidden="true" /> Refresh
                    </>
                  )}
                </Button>
              </div>
            </div>
            <CatalogTableSearch label="Search categories" placeholder="Search categories..." value={query}
              disabled={categories.length === 0}
              onChange={(value) => { setQuery(value); setPage(0); }} />
            {selectedCategories.length > maxDeleteCount && (
              <p className="text-right text-sm text-muted-foreground">
                Select up to 100 categories at a time to delete.
              </p>
            )}
          </div>
          {error && (
            <p
              role="alert"
              className="border-b px-5 py-3 text-sm text-destructive"
            >
              {error} Use Refresh to try again.
            </p>
          )}
          <Table
            className="min-w-[64rem] table-fixed"
            aria-label="Catalog categories"
          >
            <colgroup>
              <col className="w-12" />
              <col className="w-[4.5rem]" />
              <col />
              <col className="w-52" />
              <col className="w-28" />
              <col className="w-36" />
              <col className="w-[7.5rem]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className={`${headClass} !p-0 text-center`}>
                  <Checkbox
                    className="mx-auto"
                    aria-label="Select categories on this page"
                    checked={allSelected}
                    indeterminate={
                      !allSelected &&
                      rows.some(({ id }) => selected.includes(id))
                    }
                    disabled={loading || Boolean(error) || !rows.length}
                    onCheckedChange={(checked) =>
                      setSelected((current) => {
                        const pageIds = rows.map(({ id }) => id);
                        return checked
                          ? [...new Set([...current, ...pageIds])]
                          : current.filter((id) => !pageIds.includes(id));
                      })
                    }
                  />
                </TableHead>
                <TableHead className={`${headClass} text-center`}>
                  S. No.
                </TableHead>
                {sortColumns.map(([key, title]) => {
                  const Icon =
                    sort.key !== key
                      ? ArrowUpDown
                      : sort.desc
                        ? ArrowDown
                        : ArrowUp;
                  return (
                    <TableHead
                      key={key}
                      className={headClass}
                      aria-sort={
                        sort.key === key
                          ? sort.desc
                            ? "descending"
                            : "ascending"
                          : undefined
                      }
                    >
                      <button
                        className="inline-flex min-h-11 items-center gap-2"
                        type="button"
                        onClick={() => {
                          setSort({
                            key,
                            desc: sort.key === key && !sort.desc,
                          });
                          setPage(0);
                        }}
                      >
                        {title}
                        <Icon
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </button>
                    </TableHead>
                  );
                })}
                <TableHead className={`${headClass} text-center`}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody
              aria-busy={loading}
              className="[&_tr:last-child]:border-b"
            >
              {!loading &&
                rows.map((item, index) => (
                  <TableRow key={item.id} className="h-20">
                    <TableCell className={`${cellClass} !p-0 text-center`}>
                      <Checkbox
                        className="mx-auto"
                        aria-label={`Select ${item.title}`}
                        checked={selected.includes(item.id)}
                        disabled={Boolean(error)}
                        onCheckedChange={(checked) =>
                          setSelected((current) =>
                            checked
                              ? [...new Set([...current, item.id])]
                              : current.filter((id) => id !== item.id),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell
                      className={`${cellClass} text-center text-muted-foreground`}
                    >
                      {visiblePage * pageSize + index + 1}
                    </TableCell>
                    <TableCell className={cellClass}>
                      <div className="flex w-full min-w-0 items-center gap-3">
                        <Image
                          src={item.coverUrl}
                          width={48}
                          height={48}
                          unoptimized
                          alt=""
                          className="size-12 shrink-0 rounded-lg border bg-muted/40 object-contain"
                        />
                        <span
                          className="min-w-0 flex-1 truncate font-medium text-heading"
                          title={item.title}
                        >
                          {item.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={cellClass}>
                      <span className="block truncate" title={`/${item.slug}`}>
                        /{item.slug}
                      </span>
                    </TableCell>
                    <TableCell
                      className={`${cellClass} text-center tabular-nums`}
                    >
                      {item.productCount}
                    </TableCell>
                    <TableCell className={`${cellClass} text-center`}>
                      {dateFormat.format(new Date(item.createdAt))}
                    </TableCell>
                    <TableCell className={cellClass}>
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          style={{ boxShadow: rowShadow }}
                          className={`${rowButton} hover:bg-[#ffce00] hover:text-heading`}
                          disabled={Boolean(error)}
                          aria-label={`Edit ${item.title}`}
                          onClick={() => setEditing(item)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          style={{ boxShadow: rowShadow }}
                          className={`${rowButton} text-destructive hover:bg-red-500 hover:text-white`}
                          disabled={Boolean(error)}
                          aria-label={`Delete ${item.title}`}
                          onClick={() => confirmDelete([item])}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && !rows.length && (
                <CatalogTableEmptyRow columns={7} rows={pageSize} icon={Folder}
                  title={error ? "Categories unavailable" : categories.length ? "No categories found" : "No categories yet"}
                  description={error ? "Use Refresh to try again." : categories.length ? "Try another search or clear the search box." : "Use Add Category to create your first category."} />
              )}
              {Array.from(
                {
                  length: loading
                    ? pageSize
                    : rows.length ? pageSize - rows.length : 0,
                },
                (_, index) => (
                  <TableRow key={index} className="h-20" aria-hidden="true">
                    {Array.from({ length: 7 }, (_, column) => (
                      <TableCell key={column} className={cellClass}>
                        {loading && (
                          <Skeleton className="mx-auto h-5 w-full max-w-20" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between gap-3 border-t p-4 text-sm sm:p-5">
            <span className="text-muted-foreground">
              {filtered.length}{" "}
              {filtered.length === 1 ? "category" : "categories"}
            </span>
            <div className="flex items-center gap-3">
              <span className="tabular-nums">
                {visiblePage + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                className="size-10 rounded-none"
                style={{ boxShadow: catalogButtonShadow }}
                aria-label="Previous category page"
                disabled={loading || visiblePage === 0}
                onClick={() => setPage(visiblePage - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                className="size-10 rounded-none"
                style={{ boxShadow: catalogButtonShadow }}
                aria-label="Next category page"
                disabled={loading || visiblePage + 1 >= pageCount}
                onClick={() => setPage(visiblePage + 1)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {(adding || editing) && (
        <CatalogCategoryEditor
          category={editing}
          onSave={save}
          onClose={() => {
            setEditing(null);
            closeAdd();
          }}
        />
      )}
      <AlertDialog
        open={deleteTargets.length > 0}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTargets([]);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            Delete{" "}
            {deleteTargets.length === 1
              ? "category"
              : `${deleteTargets.length} categories`}
            ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deleteTargets.length === 1
              ? `“${deleteTargets[0]?.title}” will be permanently deleted.`
              : "The selected categories will be permanently deleted."}{" "}
            Categories must be empty and removed from the storefront collection
            before deletion.
          </AlertDialogDescription>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="h-11 rounded-none"
              style={{ boxShadow: catalogButtonShadow }}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              className={bulkButton}
              style={{ boxShadow: catalogButtonShadow }}
              disabled={deleting}
              onClick={removeCategories}
            >
              {deleting ? (
                <>
                  <Spinner aria-hidden="true" /> Deleting
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
