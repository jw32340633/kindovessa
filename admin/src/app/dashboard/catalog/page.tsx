import DashboardCatalogPage from "@/views/dashboard/dashboard-catalog-page";
import ProtectedPage from "@/components/shared/protected-page";

export default function DashboardCatalog() {
  return (
    <ProtectedPage>
      <DashboardCatalogPage />
    </ProtectedPage>
  );
}
