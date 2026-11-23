import DashboardSettingsPage from "@/views/dashboard/dashboard-settings-page";
import ProtectedPage from "@/components/shared/protected-page";

function DashboardSettings() {
  return (
    <ProtectedPage>
      <DashboardSettingsPage />
    </ProtectedPage>
  );
}

export default DashboardSettings;
