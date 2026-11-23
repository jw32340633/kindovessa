import DashboardCatalogTableSkeleton from "@/components/shared/dashboard-catalog-table-skeleton";

import { catalogPageSizes } from "@/data/catalog-data";

export default function Loading() {
  return (
    <div className="dashboard-layout">
      <DashboardCatalogTableSkeleton
        rows={catalogPageSizes.categories}
        label="Loading categories"
      />
      <DashboardCatalogTableSkeleton
        rows={catalogPageSizes.products}
        label="Loading products"
      />
    </div>
  );
}
