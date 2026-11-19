"use client";

import { useId, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Package, Search, SearchX, X } from "lucide-react";

import {
  matchesSearchProduct,
  searchProductsData,
  type SearchProduct,
} from "@/data/products/search-products-data";
import { formatCartMoney } from "@/utils/cart";

export default function HeaderSearch() {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const hasQuery = query.trim().length > 0;
  const results = hasQuery
    ? searchProductsData.filter((product) =>
        matchesSearchProduct(product, query),
      )
    : [];
  const suggestions = showAll ? results : results.slice(0, 5);

  return (
    <div className="col-span-2 row-start-2 min-w-0 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:ml-auto lg:w-full lg:max-w-120">
      <Combobox.Root<SearchProduct>
        items={searchProductsData}
        filteredItems={suggestions}
        inputValue={query}
        onInputValueChange={(value) => {
          setQuery(value);
          setShowAll(false);
        }}
        open={open && hasQuery}
        onOpenChange={setOpen}
        itemToStringLabel={(product) => product.title}
        autoHighlight
      >
        <label htmlFor={id} className="sr-only">
          Search products
        </label>
        <Combobox.InputGroup className="flex min-h-12 items-center gap-3 rounded-full border border-border bg-input pl-4 pr-1 transition-[border-color,box-shadow] duration-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 md:min-h-13 md:pl-5 motion-reduce:transition-none">
          <Search
            size={20}
            strokeWidth={1.5}
            className="shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <Combobox.Input
            id={id}
            placeholder="Search everyday essentials"
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            maxLength={150}
            className="min-w-0 flex-1 bg-transparent py-3 font-body text-base text-heading outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {query && (
            <Combobox.Clear
              aria-label="Clear search"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X size={18} aria-hidden="true" />
            </Combobox.Clear>
          )}
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner
            sideOffset={10}
            align="start"
            className="z-40 max-w-[calc(100vw-2rem)]"
          >
            <Combobox.Popup className="flex max-h-[min(30rem,60dvh,var(--available-height))] w-[var(--anchor-width)] max-w-[calc(100vw-2rem)] origin-top flex-col overflow-hidden rounded-2xl border border-border bg-input text-heading shadow-xl transition-[opacity,transform] duration-200 data-starting-style:translate-y-1 data-starting-style:opacity-0 data-ending-style:translate-y-1 data-ending-style:opacity-0 motion-reduce:transition-none">
              <div className="shrink-0 border-b border-border px-4 py-3 md:px-5">
                <p className="text-sm font-semibold">Search results</p>
                <p
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  className="mt-1 text-xs text-muted-foreground"
                >
                  {results.length}{" "}
                  {results.length === 1 ? "product" : "products"} found
                  {results.length > 5 && !showAll
                    ? " · Showing the first 5"
                    : ""}
                </p>
              </div>
              <Combobox.Empty className="flex flex-col items-center px-5 py-9 text-center empty:hidden">
                <SearchX
                  className="mb-3 size-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-base font-semibold">No products found</p>
                <p className="mt-2 max-w-64 text-sm leading-relaxed text-muted-foreground">
                  Try a product name, brand, or category such as personal care.
                </p>
              </Combobox.Empty>
              <Combobox.List className="min-h-0 overflow-y-auto overscroll-contain px-3 py-1 outline-none">
                {(product: SearchProduct) => (
                  <Combobox.Item
                    key={product.id}
                    value={product}
                    className="flex cursor-pointer items-center gap-3 border-b border-border/60 px-2 py-4 last:border-b-0 outline-none transition-colors hover:bg-muted data-highlighted:bg-muted motion-reduce:transition-none"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-card md:size-16"
                    >
                      <Package
                        size={24}
                        strokeWidth={1.25}
                        className="text-muted-foreground/60"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug md:text-base">
                        {product.title}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {product.category}
                      </span>
                      <span className="mt-1.5 block text-sm font-bold tabular-nums">
                        {formatCartMoney(
                          product.unitPriceCents,
                          product.currency,
                        )}
                      </span>
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
              {results.length > 5 && !showAll && (
                <div className="shrink-0 border-t border-border px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="min-h-11 w-full rounded-lg text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    View all results ({results.length})
                  </button>
                </div>
              )}
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
