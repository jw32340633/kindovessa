import DashboardSalesPage from "@/views/dashboard/dashboard-sales-page";
import ProtectedPage from "@/components/shared/protected-page";

export default function DashboardSales() {
  return (
    <ProtectedPage>
      <DashboardSalesPage />
    </ProtectedPage>
  );
}
