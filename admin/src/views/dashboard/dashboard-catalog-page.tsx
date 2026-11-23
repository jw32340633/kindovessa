"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CatalogCategory } from "@/data/catalog-data";
import CategoryTableCard, { catalogButtonShadow } from "@/sections/catalog/category-table-card";
import ProductTableCard from "@/sections/catalog/product-table-card";

const addButton = "h-12 gap-2 rounded-none px-6 text-sm font-semibold";

export default function DashboardCatalogPage() {
  const [adding, setAdding] = useState<"category" | "product" | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoryRefresh, setCategoryRefresh] = useState(0);
  const [productRefresh, setProductRefresh] = useState(0);

  return (
    <main className="dashboard-layout">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Product Catalog</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage products, categories, variants, and product details.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" style={{ boxShadow: catalogButtonShadow }}
            className={`${addButton} bg-black text-white hover:bg-black/85 hover:text-white`}
            onClick={() => setAdding("category")}>
            <Plus className="size-4 shrink-0" aria-hidden="true" /> Add Category
          </Button>
          <Button type="button" style={{ boxShadow: catalogButtonShadow }} className={addButton}
            disabled={categories.length === 0} onClick={() => setAdding("product")}>
            <Plus className="size-4 shrink-0" aria-hidden="true" /> Add Product
          </Button>
        </div>
      </div>
      <Separator className="h-0.5 w-full" />
      <CategoryTableCard categories={categories} setCategories={setCategories} adding={adding === "category"}
        closeAdd={() => setAdding(null)} refreshKey={categoryRefresh} onChanged={() => setProductRefresh((value) => value + 1)} />
      <ProductTableCard categories={categories} adding={adding === "product"}
        closeAdd={() => setAdding(null)} refreshKey={productRefresh} onChanged={() => setCategoryRefresh((value) => value + 1)} />
    </main>
  );
}
