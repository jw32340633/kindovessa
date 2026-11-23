import DashboardMerchandisingPage from "@/views/dashboard/dashboard-merchandising-page";
import ProtectedPage from "@/components/shared/protected-page";

export default function DashboardMerchandising() {
  return (
    <ProtectedPage>
      <DashboardMerchandisingPage />
    </ProtectedPage>
  );
}
