"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { catalogButtonShadow } from "@/sections/catalog/catalog-table-controls";
import ProductTableCard from "@/sections/catalog/product-table-card";

const addButton = "h-12 gap-2 rounded-none px-6 text-sm font-semibold";

export default function DashboardCatalogPage() {
  const [adding, setAdding] = useState(false);

  return (
    <main className="dashboard-layout">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Product Catalog</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage products, variants, and product details.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" style={{ boxShadow: catalogButtonShadow }} className={addButton}
            onClick={() => setAdding(true)}>
            <Plus className="size-4 shrink-0" aria-hidden="true" /> Add Product
          </Button>
        </div>
      </div>
      <Separator className="h-0.5 w-full" />
      <ProductTableCard adding={adding} closeAdd={() => setAdding(false)} />
    </main>
  );
}
